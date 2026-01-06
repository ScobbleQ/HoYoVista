import {
    SlashCommandBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    MessageFlags,
    TextDisplayBuilder,
    SectionBuilder,
} from 'discord.js';
import { fetchLinkedAccount } from '../hoyolab/fetchLinkedAccount.js';
import { MongoDB } from '../class/mongo.js';
import { fetchGameIndex } from '../hoyolab/fetchGameIndex.js';
import { Game } from '../hoyolab/constants.js';
import { errorEmbed } from '../utils/embedTemplates.js';
import { StygianDifficulty } from '../utils/emojis.js';
import { addEvent } from '../db/queries.js';

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
        const fetchingContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`Retrieving your data. Please wait...`)
        );
        await interaction.reply({ components: [fetchingContainer], flags: MessageFlags.IsComponentsV2 });

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
            await addEvent(interaction.user.id, {
                game: 'discord',
                type: 'interaction',
                metadata: {
                    command: 'profile',
                    gameId: gameId,
                },
            });
        }

        // error code + account
        if (gameId === '-1' && retcode === 1) {
            const embed = errorEmbed({ message: 'None of your linked games are supported for this command.' });
            return interaction.editReply({ embeds: [embed] });
        }

        // get linked games from user data
        const linkedGames = user.linked_games;
        const gameKey = Object.keys(linkedGames).find((key) => linkedGames[key].game_id.toString() === gameId);

        const { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang } = user.hoyolab_cookies;
        const { game_id, game_role_id, region, region_name } = linkedGames[gameKey];
        const userFetchTime = Date.now() - startUserFetchTime;

        // send querying message (successful account retrieval)
        const queryingContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                `Account successfully retrieved in ${userFetchTime}ms.\nFetching profile from HoYoverse...`
            )
        );
        await interaction.editReply({ components: [queryingContainer], flags: MessageFlags.IsComponentsV2 });

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
        const preparingContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`Profile retrieved in ${indexFetchTime}ms.\nPreparing your data...`)
        );
        await interaction.editReply({ components: [preparingContainer], flags: MessageFlags.IsComponentsV2 });

        let enkaData = null;
        const container = new ContainerBuilder().setAccentColor();

        if (gameId === Game.GENSHIN) {
            const res = await fetch(`https://enka.network/api/uid/${game_role_id}`, {
                headers: {
                    'User-Agent': 'ScobbleQ - TESTING',
                },
            });

            enkaData = await res.json();
            const { playerInfo } = enkaData;
            const { role, stats } = gameIndexData;

            const namecardRes = await fetch(
                `https://raw.githubusercontent.com/EnkaNetwork/API-docs/refs/heads/master/store/gi/namecards.json`
            );
            const namecards = await namecardRes.json();
            const namecardUrl = `https://enka.network/${namecards[playerInfo.nameCardId].Icon}`;

            const banner = new MediaGalleryBuilder().addItems((mediaGalleryItem) =>
                mediaGalleryItem.setURL(namecardUrl)
            );

            container.addMediaGalleryComponents(banner);

            const info = new SectionBuilder()
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(
                        [
                            `# ${role.nickname}`,
                            `-# AR ${role.level} | ${region_name} | ${game_role_id}`,
                            `${playerInfo.signature}`,
                        ].join('\n')
                    )
                )
                .setThumbnailAccessory((thumbnail) => thumbnail.setURL(role.game_head_icon));

            container.addSectionComponents(info);

            container.addSeparatorComponents((separator) => separator);

            const statDisplay = new TextDisplayBuilder().setContent(
                [
                    `Total Achievements: ${stats.achievement_number || '0'}`,
                    `Max Friendships: ${stats.full_fetter_avatar_num || '0'}`,
                    `Spiral Abyss: ${playerInfo.towerFloorIndex ? `${playerInfo.towerFloorIndex}-${playerInfo.towerLevelIndex}${playerInfo.towerStarIndex ? ` | ${playerInfo.towerStarIndex}` : ''}` : 'Not yet attempted'}`,
                    `Imaginarium Theater: ${playerInfo.theaterActIndex ? `Act ${playerInfo.theaterActIndex} | ${playerInfo.theaterStarIndex}` : 'Not yet attempted'}`,
                    `Stygian Onslaught: ${playerInfo.stygianIndex ? `${StygianDifficulty[playerInfo.stygianIndex]} ${playerInfo.stygianSeconds}s` : 'Not yet attempted'}`,
                ].join('\n')
            );

            container.addTextDisplayComponents(statDisplay);
        } else if (gameId === Game.ZZZ) {
            const res = await fetch(`https://enka.network/api/zzz/uid/${game_role_id}`, {
                headers: {
                    'User-Agent': 'ScobbleQ - TESTING',
                },
            });

            enkaData = (await res.json()).PlayerInfo;
            const { SocialDetail } = enkaData;

            const banner = new MediaGalleryBuilder().addItems((mediaGalleryItem) =>
                mediaGalleryItem.setURL(gameIndexData.game_data_show.card_url)
            );

            container.addMediaGalleryComponents(banner);

            const info = new SectionBuilder()
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(
                        [
                            `# ${SocialDetail.ProfileDetail.Nickname}`,
                            `-# Lv.${SocialDetail.ProfileDetail.Level} | ${region_name} | ${game_role_id}`,
                            `${SocialDetail.Desc}`,
                        ].join('\n')
                    )
                )
                .setThumbnailAccessory((thumbnail) => thumbnail.setURL(gameIndexData.cur_head_icon_url));

            container.addSectionComponents(info);

            container.addSeparatorComponents((separator) => separator);

            const statDisplay = new TextDisplayBuilder().setContent(
                [
                    `${gameIndexData.game_data_show.personal_title}`,
                    `Active Days: ${gameIndexData.stats.active_days}`,
                    `Achievements: ${gameIndexData.stats.achievement_count}`,
                    `Simulated Battle Trial: ${gameIndexData.stats.climbing_tower_layer}`,
                    `Battle Trial: The Last Stand: ${gameIndexData.stats.climbing_tower_s2.climbing_tower_layer}`,
                ].join('\n')
            );

            container.addTextDisplayComponents(statDisplay);
        }

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
