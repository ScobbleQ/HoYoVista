import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { embedColors } from '../../config.js';
import { MongoDB } from '../class/mongo.js';
import { Game } from '../hoyolab/constants.js';
import { fetchLinkedAccount } from '../hoyolab/fetchLinkedAccount.js';
import { fetchNotes } from '../hoyolab/fetchNotes.js';
import { GameIconUrl } from '../hoyolab/routes.js';
import { superstringDimensionTier } from '../hoyolab/gameConstants.js';
import { errorEmbed, warningEmbed, primaryEmbed } from '../utils/embedTemplates.js';

// TODO:
// GENSHIN is COMPLETE (may add parametricT)
// may improve ZZZ and GENSHIN

export default {
    data: new SlashCommandBuilder()
        .setName('notes')
        .setDescription('View your Real-Time Notes')
        .addStringOption((option) =>
            option
                .setName('account')
                .setDescription('The account to view the notes for.')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const { retcode, message, data } = await fetchLinkedAccount(interaction.user.id);

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
        const gameKey = Object.keys(linkedGames).find((key) => linkedGames[key].game_id === gameId);

        // parse cookies and game info, stop user timer
        const { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang } = user.hoyolab_cookies;
        const { game_id, game_role_id, nickname, region } = linkedGames[gameKey];
        const userFetchTime = Date.now() - startUserFetchTime;

        // send querying message (successful account retrieval)
        const queryingEmbed = warningEmbed({
            message: `Account successfully retrieved in ${userFetchTime}ms.\nFetching notes from HoYoverse...`,
        });
        await interaction.editReply({ embeds: [queryingEmbed] });

        // fetch notes
        const startNoteFetchTime = Date.now();
        const noteData = await fetchNotes(
            { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang },
            { game_id, region, game_role_id }
        );

        // notes failed
        if (noteData.retcode !== 1) {
            const errorEmbeds = errorEmbed({ message: noteData.message });
            return interaction.editReply({ embeds: [errorEmbeds] });
        }

        // notes retrieved, prepare embeds to send
        const notes = noteData.data.data;
        const noteFetchTime = Date.now() - startNoteFetchTime;
        const notesEmbed = warningEmbed({ message: `Notes retrieved in ${noteFetchTime}ms.\nPreparing your data...` });
        await interaction.editReply({ embeds: [notesEmbed] });

        const embeds = [];
        if (gameId === Game.GENSHIN) {
            const resinLevel = `${notes.current_resin}/${notes.max_resin}`;
            const resinRestore =
                notes.resin_recovery_time === '0'
                    ? 'Fully Replenished'
                    : `Full <t:${Math.floor(Date.now() / 1000) + Number(notes.resin_recovery_time)}:R>`;

            const base = primaryEmbed({
                author: { name: `${nickname} (${game_role_id})`, iconURL: GameIconUrl[gameId] },
                message: `**Original Resin** ${resinLevel}\n${resinRestore}`,
            });

            if (notes.max_home_coin !== '0') {
                const realmMax =
                    notes.home_coin_recovery_time === '0'
                        ? 'Already Full'
                        : `Replenishes <t:${Math.floor(Date.now() / 1000) + Number(notes.home_coin_recovery_time)}:R>`;
                base.addFields({
                    name: 'Jar of Riches',
                    value: `Realm Currency ${notes.current_home_coin}/${notes.max_home_coin}\n${realmMax}`,
                });
            }

            if (notes.resin_discount_num_limit) {
                base.addFields({
                    name: 'Enemies of Note',
                    value: `Discount ${notes.remain_resin_discount_num}/${notes.resin_discount_num_limit}`,
                });
            }

            if (notes.max_expedition_num) {
                base.addFields({
                    name: 'Expedition',
                    value: `Dispatched ${notes.current_expedition_num}/${notes.max_expedition_num}`,
                });
            }

            embeds.push(base);
            embeds.push(
                new EmbedBuilder()
                    .setColor(embedColors.primary)
                    .setTitle('Daily Commission Reward')
                    .addFields(
                        {
                            name: 'Daily Commissions',
                            value: `${notes.daily_task.finished_num}/${notes.daily_task.total_num}`,
                        },
                        {
                            name: 'Long-Term Encounter Points',
                            value: `x${notes.daily_task.stored_attendance}`,
                        }
                    )
            );
        } else if (gameId === Game.ZZZ) {
            const batteryLevel = `${notes.energy.progress.current}/${notes.energy.progress.max}`;
            const batteryRestore =
                notes.energy.restore === 0
                    ? 'Fully Recovered'
                    : `Full <t:${Math.floor(Date.now() / 1000) + notes.energy.restore}:R>`;
            embeds.push(
                new EmbedBuilder()
                    .setColor(embedColors.primary)
                    .setAuthor({
                        name: `${nickname} (${game_role_id})`,
                        iconURL: GameIconUrl[gameId],
                    })
                    .setThumbnail('https://act.hoyolab.com/app/zzz-game-record/images/battery-icon.b8c5b557.png')
                    .setDescription(`**Battery Charge** ${batteryLevel}\n${batteryRestore}`)
            );

            embeds.push(
                new EmbedBuilder()
                    .setColor(embedColors.primary)
                    .setTitle('Daily Missions')
                    .addFields(
                        {
                            name: 'Engagement Today',
                            value: `${notes.vitality.current}/${notes.vitality.max}`,
                        },
                        {
                            name: 'Scratch Card Mania',
                            value: notes.card_sign === 'CardSignNo' ? 'Incomplete' : 'Complete',
                        },
                        {
                            name: 'Video Store Management',
                            value:
                                notes.vhs_sale.sale_state === 'SaleStateDone' ? 'Revenue Available' : 'Currently Open',
                        }
                    )
            );

            const bountyProgress = `${notes.bounty_commission.num}/${notes.bounty_commission.total}`;
            const bountyReset = `Refreshes <t:${Math.floor(Date.now() / 1000) + notes.bounty_commission.refresh_time}:R>`;
            const riduPoints = notes.weekly_task
                ? `${notes.weekly_task.cur_point}/${notes.weekly_task.max_point}`
                : '-';
            const riduReset = notes.weekly_task
                ? `Refreshes <t:${Math.floor(Date.now() / 1000) + notes.weekly_task.refresh_time}:R>`
                : '-';
            embeds.push(
                new EmbedBuilder()
                    .setColor(embedColors.primary)
                    .setTitle('Season Missions')
                    .addFields(
                        {
                            name: 'Bounty Commission',
                            value: `Progress ${bountyProgress}\n${bountyReset}`,
                        },
                        { name: 'Ridu Weekly', value: `Points ${riduPoints}\n${riduReset}` }
                    )
            );
        } else if (gameId === Game.STARRAIL) {
            const trailblazerPowderEmoji = '<:6_TrailblazerPowder:1328559271423770655>';
            const reservedPowderEmoji = '<:6_ReservedPowder:1328559285185155196>';

            const stamina = `${notes.current_stamina}/${notes.max_stamina}`;
            const staminaRecover =
                notes.stamina_recover_time === 0 ? 'Fully Restored' : `Fully restores <t:${notes.stamina_full_ts}:R>`;
            const staminaReserved =
                notes.is_reserve_stamina_full === true ? 'Fully Maxed' : notes.current_reserve_stamina;

            const dailyTraining = `${notes.current_train_score}/${notes.max_train_score}`;
            const assignments = `${notes.accepted_epedition_num}/${notes.total_expedition_num}`;
            const echoOfWar = `${notes.weekly_cocoon_cnt}/${notes.weekly_cocoon_limit}`;
            const roguePoint = `${notes.current_rogue_score}/${notes.max_rogue_score}`;

            const embed = new EmbedBuilder()
                .setColor(embedColors.primary)
                .setAuthor({
                    name: `${nickname} (${game_role_id})`,
                    iconURL: GameIconUrl[gameId],
                })
                .addFields(
                    {
                        name: `${trailblazerPowderEmoji} ${stamina}`,
                        value: staminaRecover,
                        inline: false,
                    },
                    {
                        name: `${reservedPowderEmoji} ${staminaReserved}`,
                        value: 'Reserved Trailblaze Power',
                        inline: false,
                    },
                    { name: 'Daily Training', value: dailyTraining, inline: true },
                    { name: 'Assignments', value: assignments, inline: true },
                    { name: 'Echo of War', value: echoOfWar, inline: true },
                    { name: 'Weekly Points', value: roguePoint, inline: true }
                );

            if (notes.rogue_tourn_weekly_unlocked) {
                const bonusSynchronicity = `${notes.rogue_tourn_weekly_cur}/${notes.rogue_tourn_weekly_max}`;
                embed.addFields({ name: 'Bonus Synchronicity Points', value: bonusSynchronicity, inline: true });
            }

            embeds.push(embed);
        } else if (gameId === Game.HONKAI) {
            const stamina = `${notes.current_stamina}/${notes.max_stamina}`;
            const staminaRecover =
                notes.stamina_recover_time === 0
                    ? 'Fully Restored'
                    : `Fully restores <t:${Math.floor(Date.now() / 1000) + notes.stamina_recover_time}:R>`;
            const bpMission = `${notes.current_train_score}/${notes.max_train_score}`;

            const memorialArena = `${notes.battle_field.cur_reward}/${notes.battle_field.max_reward}`;
            const memorialArenaReset = notes.battle_field.is_open
                ? `Resets <t:${notes.battle_field.schedule_end}:R>`
                : 'Locked';

            const godOfWar = `${notes.god_war.cur_reward}/${notes.god_war.max_reward}`;
            const godOfWarReset = notes.god_war.is_open ? `Resets <t:${notes.god_war.schedule_end}:R>` : 'Closed';

            const embed = new EmbedBuilder()
                .setColor(embedColors.primary)
                .setAuthor({
                    name: `${nickname} (${game_role_id})`,
                    iconURL: GameIconUrl[gameId],
                })
                .addFields(
                    { name: 'Stamina', value: `${stamina}\n${staminaRecover}`, inline: true },
                    { name: 'BP Mission', value: `${bpMission}`, inline: true },
                    { name: '\u200B', value: '\u200B', inline: true },
                    { name: 'Memorial Arena', value: `${memorialArena}\n${memorialArenaReset}`, inline: true },
                    { name: 'Elysian Realm', value: `${godOfWar}\n${godOfWarReset}`, inline: true }
                );

            if (notes.ultra_endless.group_level === 0) {
                const manifold = `${notes.greedy_endless.cur_reward}/${notes.greedy_endless.max_reward}`;
                const manifoldReset = notes.greedy_endless.is_open
                    ? `Resets <t:${notes.greedy_endless.schedule_end}:R>`
                    : 'Closed';

                embed.addFields({ name: 'Q-Manifold', value: `${manifold}\n${manifoldReset}`, inline: true });
            } else {
                const ssDimension = `${superstringDimensionTier[notes.ultra_endless.group_level]}: ${notes.ultra_endless.challenge_score}`;
                const ssDimensionReset = notes.ultra_endless.is_open
                    ? `Resets <t:${notes.ultra_endless.schedule_end}:R>`
                    : 'Closed';

                embed.addFields({
                    name: 'Superstring Dimension',
                    value: `${ssDimension}\n${ssDimensionReset}`,
                    inline: true,
                });
            }

            embeds.push(embed);
        }

        await interaction.editReply({ embeds: embeds });
    },
};
