import {
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  codeBlock,
} from 'discord.js';
import { addEvent, getCookies, getUserLinkedGames } from '../db/queries.js';
import { getUser } from '../db/queries.js';
import { fetchNotes } from '../hoyo/api/note.js';
import { Games } from '../hoyo/utils/constants.js';
import { superstringDimensionTier } from '../hoyo/utils/constants.js';
import { fetchLinkedAccounts } from '../hoyo/utils/fetchLinkedAccounts.js';
import { createTextContainer } from '../utils/containerBuilder.js';
import { GenshinCommission } from '../utils/emojis.js';
import { plural } from '../utils/plural.js';

/** @typedef {import("../utils/typedef.js").GameID} GameID */

// TODO:
// convert HSR / HONKAI / ZZZ

export default {
  cooldown: 30,
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
  /**
   * @param {import("discord.js").AutocompleteInteraction} interaction
   * @returns {Promise<void>}
   */
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const { retcode, data } = await fetchLinkedAccounts(interaction.user.id);

    if (focusedOption.name === 'account') {
      if (retcode !== 1 || !data) {
        return await interaction.respond([
          { name: 'No supported linked games found', value: '-1' },
        ]);
      }

      const filtered = data.filter((choice) =>
        choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())
      );

      await interaction.respond(
        filtered.map((choice) => ({
          name: choice.name,
          value: choice.gameId,
        }))
      );
    }
  },
  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    // fetch gameId and send initial feedback message
    const gameId = interaction.options.getString('account');
    const fetchingContainer = createTextContainer('Retrieving your data. Please wait...');
    await interaction.reply({
      components: [fetchingContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    // Fetch user data
    const startUserFetchTime = Date.now();
    const user = await getUser(interaction.user.id);
    if (!user) {
      const container = createTextContainer(
        'You are not registered. Please use the `/register` command to create an account.'
      );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    // increment command usage count (only in production)
    if (user.collectData) {
      await addEvent(interaction.user.id, {
        game: 'discord',
        type: 'interaction',
        metadata: {
          command: 'notes',
          gameId: gameId,
        },
      });
    }

    const linkedGames = await getUserLinkedGames(interaction.user.id);
    const gameKey = linkedGames.find((g) => g.gameId === gameId);
    if (!linkedGames || !gameKey) {
      const container = createTextContainer(
        'None of your linked games are supported for this command.'
      );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const cookies = await getCookies(interaction.user.id);
    const userFetchTime = Date.now() - startUserFetchTime;

    // send querying message (successful account retrieval)
    const queryingContainer = createTextContainer(
      `Account successfully retrieved in ${userFetchTime}ms.\nFetching notes from HoYoverse...`
    );
    await interaction.editReply({
      components: [queryingContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    // fetch notes
    const startNoteFetchTime = Date.now();

    const notes = await fetchNotes(gameKey.gameRoleId, {
      gameId: /** @type {GameID} */ (gameKey.gameId),
      region: gameKey.region,
      cookies: cookies,
    });

    // notes failed
    if (!notes) {
      const errorContainer = createTextContainer(
        'An error occurred while fetching your notes. Please try again later.'
      );
      await interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    // notes retrieved, prepare embeds to send
    const noteFetchTime = Date.now() - startNoteFetchTime;
    const fetchedContainer = createTextContainer(
      `Notes retrieved in ${noteFetchTime}ms.\nPreparing your data...`
    );
    await interaction.editReply({
      components: [fetchedContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    const notesContainer = new ContainerBuilder();

    if (gameId === Games.GENSHIN) {
      notesContainer
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `## Real-Time Notes\n-# There may be a certain delay in data refresh, please refer to the actual game data`
          )
        )
        .addSeparatorComponents((separator) => separator);

      notesContainer.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              [
                '### Original Resin',
                notes.resin_recovery_time === '0'
                  ? 'Fully replenished'
                  : `Fully replenished in ${generateFutureRelativeTime(notes.resin_recovery_time)}`,
                codeBlock('js', `${notes.current_resin}/${notes.max_resin}`),
              ].join('\n')
            )
          )
          .setThumbnailAccessory((thumbnail) =>
            thumbnail.setURL(
              'https://act.hoyolab.com/app/community-game-records-sea/images/resion@3x.1b655e50.png'
            )
          )
      );

      if (notes.resin_discount_num_limit) {
        notesContainer.addSeparatorComponents((separator) => separator);
        notesContainer.addSectionComponents((section) =>
          section
            .addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(
                [
                  '### Enemies of Note',
                  'Remaining resin cost-halving opportunities this week',
                  codeBlock(
                    'js',
                    `${notes.remain_resin_discount_num}/${notes.resin_discount_num_limit}`
                  ),
                ].join('\n')
              )
            )
            .setThumbnailAccessory((thumbnail) =>
              thumbnail.setURL(
                'https://act.hoyolab.com/app/community-game-records-sea/images/enemy@3x.0ed07f3b.png'
              )
            )
        );
      }

      if (notes.daily_task) {
        const dailyTask = notes.daily_task;

        notesContainer.addSeparatorComponents((separator) => separator);
        notesContainer.addSectionComponents((section) =>
          section
            .addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(
                [
                  '### Daily Commission Reward',
                  '-# Daily Commissions',
                  dailyTask.task_rewards
                    .map(
                      /** @param {{ status: "temp" | "TaskRewardStatusUnfinished"}} t */ (t) =>
                        GenshinCommission[t.status]
                    )
                    .join(''),
                  '-# Encounter Points',
                  dailyTask.attendance_rewards
                    .map(
                      /** @param {{ status: "AttendanceRewardStatusTakenAward" | "AttendanceRewardStatusUnfinished"}} t */ (
                        t
                      ) => GenshinCommission[t.status]
                    )
                    .join(''),
                  `Long-Term Encounter Points \`${GenshinCommission.SEP}x${dailyTask.stored_attendance}\``,
                  codeBlock(
                    'js',
                    dailyTask.finished_num === dailyTask.total_num ? 'All Claimed' : 'not'
                  ),
                ].join('\n')
              )
            )
            .setThumbnailAccessory((thumbnail) =>
              thumbnail.setURL(
                'https://act.hoyolab.com/app/community-game-records-sea/images/daily@3x.bb9ad18b.png'
              )
            )
        );
      }

      // Realm is unlocked
      if (notes.max_home_coin !== 0) {
        notesContainer.addSeparatorComponents((separator) => separator);
        notesContainer.addSectionComponents((section) =>
          section
            .addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(
                [
                  '### Jar of Riches - Realm Currency',
                  `The Limit will be reached ${generateFutureRelativeTime(notes.home_coin_recovery_time)}`,
                  codeBlock('js', `${notes.current_home_coin}/${notes.max_home_coin}`),
                ].join('\n')
              )
            )
            .setThumbnailAccessory((thumbnail) =>
              thumbnail.setURL(
                'https://act.hoyolab.com/app/community-game-records-sea/images/money@3x.0680271d.png'
              )
            )
        );
      }

      // Parametric Transformer is obtained
      if (notes.transformer.obtained) {
        const recoveryTime = notes.transformer.recovery_time.Day;

        notesContainer.addSeparatorComponents((separator) => separator);
        notesContainer.addSectionComponents((section) =>
          section
            .addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(
                [
                  '### Parametric Transformer',
                  `Can be used again in ${recoveryTime} ${plural(recoveryTime, 'day')}`,
                  codeBlock(
                    'js',
                    `${notes.transformer.recovery_time.reached ? 'Obtained' : 'Cooldown in progress'}`
                  ),
                ].join('\n')
              )
            )
            .setThumbnailAccessory((thumbnail) =>
              thumbnail.setURL(
                'https://act.hoyolab.com/app/community-game-records-sea/images/qual@3x.4944dc56.png'
              )
            )
        );
      }
    } else if (gameId === Games.ZZZ) {
      notesContainer.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `### Battery Charge\n**${notes.energy.progress.current}/${notes.energy.progress.max}**\n${notes.energy.restore === 0 ? 'Fully Recovered' : `Full at ${notes.energy.hour}:${notes.energy.minute} ${notes.energy.day_type === 2 ? 'Tomorrow' : 'Today'}`}`
            )
          )
          .setThumbnailAccessory((thumbnail) =>
            thumbnail.setURL(
              'https://act.hoyolab.com/app/zzz-game-record/images/battery-icon.b8c5b557.png'
            )
          )
      );

      notesContainer.addSeparatorComponents((separator) => separator);

      notesContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            `### Daily Missions`,
            `Engagement Today: **${notes.vitality.current}/${notes.vitality.max}**`,
            `Scratch Card Mania: **${notes.card_sign === 'CardSignNo' ? 'Incomplete' : 'Complete'}**`,
            `Video Store Management: **${notes.vhs_sale.sale_state === 'SaleStateDone' ? 'Revenue Available' : 'Currently Open'}**`,
          ].join('\n')
        )
      );

      if (notes.bounty_commission || notes.weekly_task) {
        const seasonLines = ['### Season Missions'];

        if (notes.bounty_commission) {
          seasonLines.push(
            `Bounty Commission Progress: **${notes.bounty_commission.num}/${notes.bounty_commission.total}**`,
            notes.bounty_commission.refresh_time > 0
              ? `-# Refreshes <t:${Math.floor(Date.now() / 1000) + notes.bounty_commission.refresh_time}:R>`
              : '-'
          );
        }
        if (notes.weekly_task) {
          seasonLines.push(
            `Ridu Weekly Points: **${notes.weekly_task.cur_point}/${notes.weekly_task.max_point}**`,
            notes.weekly_task.refresh_time > 0
              ? `-# Refreshes <t:${Math.floor(Date.now() / 1000) + notes.weekly_task.refresh_time}:R>`
              : '-'
          );
        }

        notesContainer.addSeparatorComponents((separator) => separator);
        notesContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(seasonLines.join('\n'))
        );
      }
    } else if (gameId === Games.STARRAIL) {
      notesContainer.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              [
                '### Trailblazer Powder',
                `**${notes.current_stamina}**/${notes.max_stamina}`,
                notes.stamina_recover_time === 0
                  ? 'Fully Restored'
                  : `Fully restores <t:${notes.stamina_full_ts}:R>`,
              ].join('\n')
            )
          )
          .setThumbnailAccessory((thumbnail) =>
            thumbnail.setURL(
              'https://act.hoyolab.com/app/community-game-records-sea/rpg/images/icon_1.c568ba00.png'
            )
          )
      );

      notesContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `### Daily Training\n**${notes.current_train_score}**/${notes.max_train_score}`
        )
      );

      if (notes.weekly_cocoon_limit) {
        notesContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `### Echo of War\n**${notes.weekly_cocoon_cnt}**/${notes.weekly_cocoon_limit}`
          )
        );
      }

      if (notes.max_rogue_score) {
        notesContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            [
              '### Simulated Universe Points',
              `**${notes.current_rogue_score}**/${notes.max_rogue_score}`,
            ].join('\n')
          )
        );
      }

      if (notes.grid_fight_weekly_max) {
        notesContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            [
              '### Currency War Points',
              `**${notes.grid_fight_weekly_cur}**/${notes.grid_fight_weekly_max}`,
            ].join('\n')
          )
        );
      }
    } else if (gameId === Games.HONKAI) {
      notesContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            '### Stamina',
            `**${notes.current_stamina}**/${notes.max_stamina}`,
            notes.stamina_recover_time === 0
              ? 'Fully Restored'
              : `Fully restores <t:${notes.stamina_recover_time}:R>`,
            `Daily BP: **${notes.current_train_score}**/${notes.max_train_score}`,
          ].join('\n')
        )
      );

      if (notes.ultra_endless.group_level === 0) {
        notesContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            [
              '### Q-Manifold',
              notes.greedy_endless.is_open
                ? `Time Left: <t:${notes.greedy_endless.schedule_end}:R>`
                : 'Closed',
              `Current Score: **${notes.greedy_endless.cur_reward}**/${notes.greedy_endless.max_reward}`,
            ].join('\n')
          )
        );
      } else {
        notesContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            [
              '### Superstring Dimension',
              notes.ultra_endless.is_open
                ? `Time Left: <t:${notes.ultra_endless.schedule_end}:R>`
                : 'Closed',
              `Current Score: **${notes.ultra_endless.challenge_score}**`,
              `Current Tier: ${superstringDimensionTier[/** @type {keyof typeof superstringDimensionTier} */ (notes.ultra_endless.group_level)]}`,
            ].join('\n')
          )
        );
      }

      notesContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            '### Memorial Arena',
            notes.battle_field.is_open
              ? `Time Left: <t:${notes.battle_field.schedule_end}:R>`
              : 'Locked',
            `Challenge Rewards: **${notes.battle_field.cur_reward}**/${notes.battle_field.max_reward}`,
            `SSS-rank Rewards: **${notes.battle_field.cur_sss_reward}**/${notes.battle_field.max_sss_reward}`,
          ].join('\n')
        )
      );

      if (notes.god_war) {
        notesContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            [
              '### Elysian Realm',
              notes.god_war.is_open ? `Time Left: <t:${notes.god_war.schedule_end}:R>` : 'Closed',
              `Current Score: **${notes.god_war.cur_reward}**/${notes.god_war.max_reward}`,
            ].join('\n')
          )
        );
      }

      // const stamina = `${notes.current_stamina}/${notes.max_stamina}`;
      // const staminaRecover =
      //   notes.stamina_recover_time === 0
      //     ? 'Fully Restored'
      //     : `Fully restores <t:${Math.floor(Date.now() / 1000) + notes.stamina_recover_time}:R>`;
      // const bpMission = `${notes.current_train_score}/${notes.max_train_score}`;
      // const memorialArena = `${notes.battle_field.cur_reward}/${notes.battle_field.max_reward}`;
      // const memorialArenaReset = notes.battle_field.is_open
      //   ? `Resets <t:${notes.battle_field.schedule_end}:R>`
      //   : 'Locked';
      // const godOfWar = `${notes.god_war.cur_reward}/${notes.god_war.max_reward}`;
      // const godOfWarReset = notes.god_war.is_open
      //   ? `Resets <t:${notes.god_war.schedule_end}:R>`
      //   : 'Closed';
      // const embed = new EmbedBuilder()
      //   .setColor(embedColors.primary)
      //   .setAuthor({
      //     name: `${nickname} (${game_role_id})`,
      //     iconURL: GameIconUrl[gameId],
      //   })
      //   .addFields(
      //     { name: 'Stamina', value: `${stamina}\n${staminaRecover}`, inline: true },
      //     { name: 'BP Mission', value: `${bpMission}`, inline: true },
      //     { name: '\u200B', value: '\u200B', inline: true },
      //     {
      //       name: 'Memorial Arena',
      //       value: `${memorialArena}\n${memorialArenaReset}`,
      //       inline: true,
      //     },
      //     { name: 'Elysian Realm', value: `${godOfWar}\n${godOfWarReset}`, inline: true }
      //   );
      // if (notes.ultra_endless.group_level === 0) {
      //   const manifold = `${notes.greedy_endless.cur_reward}/${notes.greedy_endless.max_reward}`;
      //   const manifoldReset = notes.greedy_endless.is_open
      //     ? `Resets <t:${notes.greedy_endless.schedule_end}:R>`
      //     : 'Closed';
      //   embed.addFields({
      //     name: 'Q-Manifold',
      //     value: `${manifold}\n${manifoldReset}`,
      //     inline: true,
      //   });
      // } else {
      //   const ssDimension = `${superstringDimensionTier[notes.ultra_endless.group_level]}: ${notes.ultra_endless.challenge_score}`;
      //   const ssDimensionReset = notes.ultra_endless.is_open
      //     ? `Resets <t:${notes.ultra_endless.schedule_end}:R>`
      //     : 'Closed';
      //   embed.addFields({
      //     name: 'Superstring Dimension',
      //     value: `${ssDimension}\n${ssDimensionReset}`,
      //     inline: true,
      //   });
      // }
      // embeds.push(embed);
    }

    await interaction.editReply({
      components: [notesContainer],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
};

/**
 * Generates a relative time string for a future event
 * @param {string} timestamp - seconds from now until the event
 * @returns {string} - relative time string
 */
const generateFutureRelativeTime = (timestamp) => {
  const now = Date.now() / 1000;
  const future = now + Number(timestamp);
  return `<t:${Math.floor(future)}:R>`;
};
