import { SlashCommandBuilder } from 'discord.js';
import { fetchLinkedAccount } from '../hoyolab/fetchLinkedAccount.js';
import { MongoDB } from '../class/mongo.js';
import { fetchGameIndex } from '../hoyolab/fetchGameIndex.js';
import { prettyStats } from '../utils/pretty.js';
import { Game } from '../hoyolab/constants.js';
import { errorEmbed, warningEmbed, primaryEmbed } from '../utils/embedTemplates.js';

// TODO:
// display personalized stats
// add STARRAIL and HONKAI

export default {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('view game profile')
        .addStringOption((option) =>
            option
                .setName('account')
                .setDescription('The account to view the profile for.')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const { retcode, message, data } = await fetchLinkedAccount(interaction.user.id, {
            exclude: [Game.STARRAIL, Game.HONKAI],
        });

        if (focusedOption.name === 'account') {
            if (retcode !== 1 || !data) {
                return await interaction.respond([{ name: message, value: '-1' }]);
            }

            const filtered = data.filter((choice) =>
                choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())
            );

            await interaction.respond(
                filtered.map((choice) => ({
                    name: choice.name,
                    value: choice.id,
                }))
            );
        }
    },
    async execute(interaction) {
        // fetch gameId and send initial feedback message
        const gameId = interaction.options.getString('account');
        const fetchingEmbed = warningEmbed({ message: 'Retrieving your data. Please wait...' });
        await interaction.reply({ embeds: [fetchingEmbed] });

        // fetch user data from MongoDB
        const startUserFetchTime = Date.now();
        const mongo = MongoDB.getInstance();
        const { retcode, data: user } = await mongo.getUserData(interaction.user.id);

        // error code + no account
        if (gameId === '-1' && retcode === -1) {
            const embed = errorEmbed({
                message: 'You are not registered. Please use the `/register` command to create an account.',
            });
            return interaction.editReply({ embeds: [embed] });
        }

        // increment command usage count
        if (user.settings.collect_data) {
            mongo.increment(interaction.user.id, { field: 'stats.command_used', value: 1 });
        }

        // error code + account
        if (gameId === '-1' && retcode === 1) {
            const embed = errorEmbed({ message: 'None of your linked games are supported for this command.' });
            return interaction.editReply({ embeds: [embed] });
        }

        // get linked games from user data
        const linkedGames = user.linked_games;
        const gameKey = Object.keys(linkedGames).find((key) => linkedGames[key].game_id.toString() === gameId);

        // get user cookies and game info, stop user timer
        const { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang } = user.hoyolab_cookies;
        const { game_id, game_role_id, nickname, region } = linkedGames[gameKey];
        const userFetchTime = Date.now() - startUserFetchTime;

        // send querying message (successful account retrieval)
        const queryingEmbed = warningEmbed({
            message: `Account successfully retrieved in ${userFetchTime}ms.\nFetching profile from HoYoverse...`,
        });
        await interaction.editReply({ embeds: [queryingEmbed] });

        // fetch game index
        const indexStartTime = Date.now();
        const gameIndex = await fetchGameIndex(
            { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang },
            { game_id, region, game_role_id }
        );

        // indexing failed
        if (gameIndex.retcode !== 1) {
            const errorEmbeds = errorEmbed({ message: gameIndex.message });
            return interaction.editReply({ embeds: [errorEmbeds] });
        }

        // stats retrieved
        const gameIndexData = gameIndex.data.data;
        const indexFetchTime = Date.now() - indexStartTime;
        const indexEmbed = warningEmbed({
            message: `Profile retrieved in ${indexFetchTime}ms.\nPreparing your data...`,
        });
        await interaction.editReply({ embeds: [indexEmbed] });

        // get stat overview
        const gameStats = gameIndexData.stats;
        const statDescription = Object.entries(gameStats)
            .filter(([_, value]) => typeof value === 'number' || typeof value === 'string')
            .map(([key, value]) => `${prettyStats[key] || key}: ${value}`)
            .join('\n');

        // create embed
        const embed = primaryEmbed({
            title: `${nickname} (${game_role_id})`,
            author: { name: `${nickname} (${game_role_id})` },
            description: statDescription,
            thumbnail: gameIndexData?.role?.game_head_icon || gameIndexData?.cur_head_icon_url,
        });

        await interaction.editReply({ embeds: [embed] });
    },
};
