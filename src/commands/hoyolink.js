import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
} from 'discord.js';
import { createEmbed } from '../utils/createEmbed.js';
import { MongoDB } from '../class/mongo.js';
import { embedColors } from '../../config.js';
import { parseCookies } from '../utils/parseCookies.js';
import { fetchGameRecord } from '../hoyolab/fetchGameRecord.js';
import { IdToAbbr } from '../hoyolab/constants.js';

export default {
    data: new SlashCommandBuilder()
        .setName('hoyolink')
        .setDescription('Link your HoYoLAB account.')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const mongo = MongoDB.getInstance();
        const { retcode, data } = await mongo.getUserData(interaction.user.id);

        // Check if the user is not registered
        if (retcode === -1) {
            const embed = createEmbed(
                'You are not registered. Please use the `/register` command to create an account.'
            );
            return interaction.editReply({ embeds: [embed] });
        }

        if (data.settings.collect_data) {
            mongo.increment(interaction.user.id, { field: 'stats.command_used', value: 1 });
        }

        // Check if the user has already linked their HoYoLAB account
        if (data.hoyolab_cookies) {
            const embed = createEmbed('Your HoYoLAB account is already linked.');
            return interaction.editReply({ embeds: [embed] });
        }

        const embed = createEmbed(
            'No HoYoLAB account linked. Press the button below to get started.',
            embedColors.primary
        );

        const addButton = new ButtonBuilder()
            .setCustomId('hoyolink-add')
            .setLabel('Add HoYoLAB Account')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('<:Registration:1277006987024142408>');

        const guideButton = new ButtonBuilder()
            .setCustomId('hoyolink-guide')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('<:Info:1277007040803242075>');

        await interaction.editReply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(addButton, guideButton)],
        });
    },
    async handleButtonClick(interaction) {
        const button = interaction.customId.split('-')[1];

        if (button === 'add') {
            const addAccount = new ModalBuilder().setCustomId('hoyolink').setTitle('Enter Cookies');
            const cookie = new TextInputBuilder()
                .setCustomId('cookies')
                .setLabel('Cookies')
                .setPlaceholder('Enter your cookies here')
                .setStyle(TextInputStyle.Paragraph);

            const row = new ActionRowBuilder().addComponents(cookie);
            addAccount.addComponents(row);

            await interaction.showModal(addAccount);
        } else if (button === 'guide') {
            const instructions =
                '1. Go to the [HoYoLAB](https://www.hoyolab.com/home) website and log in to your account.\n' +
                '2. Click on your profile picture and select **”Personal Homepage”**.\n' +
                "3. Open your browser's developer tools ([How to open DevTools](https://balsamiq.com/support/faqs/browserconsole/)).\n" +
                '4. Navigate to the **“Network”** tab in DevTools, then refresh the page (Ctrl+R or Cmd+R).\n' +
                '5. In the filter box, type **“getGame”** and click on the result labeled **“getGameRecordCard”**.\n' +
                '6. Under the **“Request Headers“** section, locate the `Cookie` field and copy everything after the word **“Cookie:”**.\n' +
                '7. Click **“Add HoYoLAB Account“**, and paste the cookies into the text field provided.';

            const embed = new EmbedBuilder()
                .setColor(embedColors.primary)
                .setTitle('Getting your HoYoLAB cookies')
                .setDescription(instructions);

            const sampleButton = new ButtonBuilder()
                .setCustomId('hoyolink-sample')
                .setLabel('Show sample cookies')
                .setStyle(ButtonStyle.Secondary);

            await interaction.reply({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(sampleButton)],
                flags: MessageFlags.Ephemeral,
            });
        } else if (button === 'sample') {
            const sampleCookies =
                'ltmid_v2=____; ltoken_v2=v2____; ltuid_v2=____; DEVICEFP=____; HYV_LOGIN_PLATFORM_LIFECYCLE_ID={}; HYV_LOGIN_PLATFORM_LOAD_TIMEOUT={}; HYV_LOGIN_PLATFORM_TRACKING_MAP={}; _HYVUUID=____; _MHYUUID=____; mi18nLang=en-us; account_id_v2=____; account_mid_v2=____; cookie_token_v2=v2____; HYV_LOGIN_PLATFORM_OPTIONAL_AGREEMENT={}';

            const embed = createEmbed(`\`\`\`json\n${sampleCookies}\n\`\`\``, embedColors.primary);
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    },
    async handleModalSubmit(interaction) {
        const loadingEmbed = createEmbed('We are processing your request. Please wait...', embedColors.warning);
        await interaction.update({ embeds: [loadingEmbed], components: [] });

        const id = interaction.user.id;

        const mongo = MongoDB.getInstance();

        // Get and parse the cookies
        const cookies = interaction.fields.getTextInputValue('cookies');
        const parsedCookies = parseCookies(cookies);

        // Check if all required cookies are present
        const requiredCookies = ['ltmid_v2', 'ltoken_v2', 'ltuid_v2'];
        const missingCookies = requiredCookies.filter((cookie) => !parsedCookies[cookie]);

        // If any required cookies are missing, show an error message
        if (missingCookies.length > 0) {
            const description = `The cookies provided are invalid or incomplete. The following required cookies are missing: ${missingCookies.map((cookie) => `\`${cookie}\``).join(', ')}. Please copy everything and try again.`;
            const embed = createEmbed(description);

            return interaction.editReply({ embeds: [embed] });
        }

        const defaultUpdates = [
            { field: 'stats.total_checkin', value: 0 },
            { field: 'stats.total_redeem', value: 0 },
            { field: 'settings.to_notify_checkin', value: true },
            { field: 'settings.to_notify_redeem', value: true },
            { field: 'hoyolab_cookies', value: parsedCookies },
        ].map((update) => mongo.set(id, update));
        await Promise.all(defaultUpdates);

        // Fetch game records using cookies, exit if fail
        const gameRecord = await fetchGameRecord(parsedCookies);
        if (gameRecord.retcode === -1) {
            const embed = createEmbed('An error occurred while fetching your game data. Please try again later.');
            return interaction.editReply({ embeds: [embed] });
        }

        const gameUpdates = gameRecord.data.data.list.map((game) => {
            const gameName = IdToAbbr[game.game_id];
            const gameData = {
                game_id: String(game.game_id),
                game_role_id: String(game.game_role_id),
                nickname: String(game.nickname),
                region: String(game.region),
                region_name: String(game.region_name),
                auto_checkin: true,
                auto_redeem: true,
                attempted_codes: [],
            };

            return mongo.set(id, { field: `linked_games.${gameName}`, value: gameData });
        });
        await Promise.all(gameUpdates);

        const embed = createEmbed(
            'Your HoYoLAB account has been successfully linked. All game records have been updated and linked to your profile.',
            embedColors.success
        );
        await interaction.editReply({ embeds: [embed] });
    },
};
