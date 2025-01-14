import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { embedColors } from '../../config.js';
import { MongoDB } from '../class/mongo.js';
import { Game } from '../hoyolab/constants.js';
import { fetchLinkedAccount } from '../hoyolab/fetchLinkedAccount.js';
import { fetchNotes } from '../hoyolab/fetchNotes.js';
import { createEmbed } from '../utils/createEmbed.js';
import { GameIconUrl } from '../hoyolab/routes.js';

// TODO:
// add STARRAIL and HONKAI
// GENSHIN is COMPLETE (may add parametricT)
// ZZZ is COMPLETE

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
        const { retcode, message, data } = await fetchLinkedAccount(interaction.user.id, {
            exclude: [Game.HONKAI],
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
        const fetchingEmbed = createEmbed('Retrieving your data. Please wait...', embedColors.warning);
        await interaction.reply({ embeds: [fetchingEmbed] });

        // fetch user data from MongoDB
        const startUserFetchTime = Date.now();
        const mongo = MongoDB.getInstance();
        const { retcode, data: user } = await mongo.getUserData(interaction.user.id);

        // error code + no account
        if (gameId === '-1' && retcode === -1) {
            const embed = createEmbed(
                'You are not registered. Please use the `/register` command to create an account.'
            );
            return interaction.editReply({ embeds: [embed] });
        }

        // increment command usage count
        if (user.settings.collect_data) {
            mongo.increment(interaction.user.id, { field: 'stats.command_used', value: 1 });
        }

        // error code + account
        if (gameId === '-1' && retcode === 1) {
            const embed = createEmbed('None of your linked games are supported for this command.');
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
        const queryingEmbed = createEmbed(
            `Account successfully retrieved in ${userFetchTime}ms.\nFetching notes from HoYoverse...`,
            embedColors.warning
        );
        await interaction.editReply({ embeds: [queryingEmbed] });

        // fetch notes
        const startNoteFetchTime = Date.now();
        const noteData = await fetchNotes(
            { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang },
            { game_id, region, game_role_id }
        );

        // notes failed
        if (noteData.retcode !== 1) {
            const errorEmbed = createEmbed(noteData.message);
            return interaction.editReply({ embeds: [errorEmbed] });
        }

        // notes retrieved, prepare embeds to send
        const notes = noteData.data.data;
        const noteFetchTime = Date.now() - startNoteFetchTime;
        const notesEmbed = createEmbed(
            `Notes retrieved in ${noteFetchTime}ms.\nPreparing your data...`,
            embedColors.warning
        );
        await interaction.editReply({ embeds: [notesEmbed] });

        const embeds = [];
        if (gameId === Game.GENSHIN) {
            const resinLevel = `${notes.current_resin}/${notes.max_resin}`;
            const resinRestore =
                notes.resin_recovery_time === '0'
                    ? 'Fully Replenished'
                    : `Full <t:${Math.floor(Date.now() / 1000) + Number(notes.resin_recovery_time)}:R>`;
            const base = new EmbedBuilder()
                .setColor(embedColors.primary)
                .setAuthor({
                    name: `${nickname} (${game_role_id})`,
                    iconURL: GameIconUrl[gameId],
                })
                .setDescription(`**Original Resin** ${resinLevel}\n${resinRestore}`);

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
            const stamina = `${notes.current_stamina}/${notes.max_stamina}`;
            const staminaRecover =
                notes.stamina_recover_time === 0 ? 'Fully Restored' : `Fully restores <t:${notes.stamina_full_ts}:R>`;
            const staminaDescription = `<:Hsr_TrailblazerPowder:1328559271423770655> **Trailblaze Power** ${stamina}\n${staminaRecover}`;
            const staminaReserved = notes.is_reserve_stamina_full === true ? 'Full' : notes.current_reserve_stamina;
            const staminaReservedDescription = `<:Hsr_ReservedPowder:1328559285185155196> **Reserved Trailblaze Power** ${staminaReserved}`;

            const dailyTraining = `${notes.current_train_score}/${notes.max_train_score}`;
            const echoOfWar = `${notes.weekly_cocoon_cnt}/${notes.weekly_cocoon_limit}`;
            const roguePoint = `${notes.current_rogue_score}/${notes.max_rogue_score}`;

            embeds.push(
                new EmbedBuilder()
                    .setColor(embedColors.primary)
                    .setAuthor({
                        name: `${nickname} (${game_role_id})`,
                        iconURL: GameIconUrl[gameId],
                    })
                    .setDescription(`${staminaDescription}\n${staminaReservedDescription}`)
                    .addFields(
                        { name: 'Daily Training', value: dailyTraining },
                        { name: 'Echo of War', value: echoOfWar },
                        { name: 'Weekly Points', value: roguePoint }
                    )
            );

            if (notes.total_expedition_num > 0) {
                const expeditionEmbed = new EmbedBuilder().setColor(embedColors.primary).setTitle('Assignments');

                notes.expeditions.forEach((expedition) => {
                    const status =
                        expedition.status === 'Ongoing'
                            ? `Completes <t:${Math.floor(Date.now() / 1000) + expedition.remaining_time}:R>`
                            : 'Completed';

                    expeditionEmbed.addFields({
                        name: expedition.name,
                        value: status,
                    });
                });

                embeds.push(expeditionEmbed);
            }
        }

        await interaction.editReply({ embeds: embeds });
    },
};
