import { ContainerBuilder, MessageFlags, SlashCommandBuilder, codeBlock } from 'discord.js';
import { addEvent, getCookies, getUserLinkedGames } from '../db/queries.js';
import { getUser } from '../db/queries.js';
import { fetchNotes } from '../hoyo/api/note.js';
import { Games } from '../hoyo/utils/constants.js';
import { superstringDimensionTier } from '../hoyo/utils/constants.js';
import { fetchLinkedAccounts } from '../hoyo/utils/fetchLinkedAccounts.js';
import { createTextContainer } from '../utils/containerBuilder.js';
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
      notesContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Real-Time Notes\n-# There may be a certain delay in data refresh, please refer to the actual game data`
        )
      );

      let resinText = '### Original Resin\n';
      if (notes.resin_recovery_time === '0') {
        resinText += 'Original Resin is fully replenished';
      } else {
        resinText += `Fully replenished in ${generateFutureRelativeTime(notes.resin_recovery_time)}`;
      }

      notesContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `${resinText}\n${codeBlock('js', `${notes.current_resin}/${notes.max_resin}`)}`
        )
      );

      notesContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `### Enemies of Note\nRemaining resin cost-halving opportunities this week\n${codeBlock('js', `${notes.remain_resin_discount_num}/${notes.resin_discount_num_limit}`)}`
        )
      );

      if (notes.daily_task) {
        // TODO: Add more information
        const dailyTask = notes.daily_task;
        console.dir(dailyTask, { depth: null });
        notesContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `### Daily Commission Reward\n${codeBlock('js', `${dailyTask.finished_num}/${dailyTask.total_num}`)}`
          )
        );
      }

      // Realm is unlocked
      if (notes.max_home_coin !== 0) {
        notesContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `### Jar of Riches - Realm Currency\nThe Limit will be reached ${generateFutureRelativeTime(notes.home_coin_recovery_time)}\n${codeBlock('js', `${notes.current_home_coin}/${notes.max_home_coin}`)}`
          )
        );
      }

      // Parametric Transformer is obtained
      if (notes.transformer.obtained) {
        const transformer = notes.transformer;
        const recoveryTime = transformer.recovery_time.Day;
        notesContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `### Parametric Transformer\nCan be used again in ${recoveryTime} ${plural(recoveryTime, 'day')} ${codeBlock(`${transformer.recovery_time.reached ? 'Obtained' : 'Cooldown in progress'}`)}`
          )
        );
      }
    } else if (gameId === Games.ZZZ) {
      // const batteryLevel = `${notes.energy.progress.current}/${notes.energy.progress.max}`;
      // const batteryRestore =
      //   notes.energy.restore === 0
      //     ? 'Fully Recovered'
      //     : `Full <t:${Math.floor(Date.now() / 1000) + notes.energy.restore}:R>`;
      // embeds.push(
      //   new EmbedBuilder()
      //     .setColor(embedColors.primary)
      //     .setAuthor({
      //       name: `${nickname} (${game_role_id})`,
      //       iconURL: GameIconUrl[gameId],
      //     })
      //     .setThumbnail(
      //       'https://act.hoyolab.com/app/zzz-game-record/images/battery-icon.b8c5b557.png'
      //     )
      //     .setDescription(`**Battery Charge** ${batteryLevel}\n${batteryRestore}`)
      // );
      // embeds.push(
      //   new EmbedBuilder()
      //     .setColor(embedColors.primary)
      //     .setTitle('Daily Missions')
      //     .addFields(
      //       {
      //         name: 'Engagement Today',
      //         value: `${notes.vitality.current}/${notes.vitality.max}`,
      //       },
      //       {
      //         name: 'Scratch Card Mania',
      //         value: notes.card_sign === 'CardSignNo' ? 'Incomplete' : 'Complete',
      //       },
      //       {
      //         name: 'Video Store Management',
      //         value:
      //           notes.vhs_sale.sale_state === 'SaleStateDone'
      //             ? 'Revenue Available'
      //             : 'Currently Open',
      //       }
      //     )
      // );
      // if (notes.bounty_commission || notes.weekly_task) {
      //   const resetMissionsEmbed = new EmbedBuilder()
      //     .setColor(embedColors.primary)
      //     .setTitle('Season Missions');
      //   if (notes.bounty_commission) {
      //     const bountyProgress = `${notes.bounty_commission.num}/${notes.bounty_commission.total}`;
      //     const bountyReset = `Refreshes <t:${Math.floor(Date.now() / 1000) + notes.bounty_commission.refresh_time}:R>`;
      //     resetMissionsEmbed.addFields({
      //       name: 'Bounty Commission',
      //       value: `Progress ${bountyProgress}\n${bountyReset}`,
      //     });
      //   }
      //   if (notes.weekly_task) {
      //     const riduPoints = notes.weekly_task
      //       ? `${notes.weekly_task.cur_point}/${notes.weekly_task.max_point}`
      //       : '-';
      //     const riduReset = notes.weekly_task
      //       ? `Refreshes <t:${Math.floor(Date.now() / 1000) + notes.weekly_task.refresh_time}:R>`
      //       : '-';
      //     resetMissionsEmbed.addFields({
      //       name: 'Ridu Weekly',
      //       value: `Points ${riduPoints}\n${riduReset}`,
      //     });
      //   }
      //   embeds.push(resetMissionsEmbed);
      // }
    } else if (gameId === Games.STARRAIL) {
      // const trailblazerPowderEmoji = '<:6_TrailblazerPowder:1328559271423770655>';
      // const reservedPowderEmoji = '<:6_ReservedPowder:1328559285185155196>';
      // const stamina = `${notes.current_stamina}/${notes.max_stamina}`;
      // const staminaRecover =
      //   notes.stamina_recover_time === 0
      //     ? 'Fully Restored'
      //     : `Fully restores <t:${notes.stamina_full_ts}:R>`;
      // const staminaReserved =
      //   notes.is_reserve_stamina_full === true ? 'Fully Maxed' : notes.current_reserve_stamina;
      // const dailyTraining = `${notes.current_train_score}/${notes.max_train_score}`;
      // const assignments = `${notes.accepted_epedition_num}/${notes.total_expedition_num}`;
      // const echoOfWar = `${notes.weekly_cocoon_cnt}/${notes.weekly_cocoon_limit}`;
      // const roguePoint = `${notes.current_rogue_score}/${notes.max_rogue_score}`;
      // const embed = new EmbedBuilder()
      //   .setColor(embedColors.primary)
      //   .setAuthor({
      //     name: `${nickname} (${game_role_id})`,
      //     iconURL: GameIconUrl[gameId],
      //   })
      //   .addFields(
      //     {
      //       name: `${trailblazerPowderEmoji} ${stamina}`,
      //       value: staminaRecover,
      //       inline: false,
      //     },
      //     {
      //       name: `${reservedPowderEmoji} ${staminaReserved}`,
      //       value: 'Reserved Trailblaze Power',
      //       inline: false,
      //     },
      //     { name: 'Daily Training', value: dailyTraining, inline: true },
      //     { name: 'Assignments', value: assignments, inline: true },
      //     { name: 'Echo of War', value: echoOfWar, inline: true },
      //     { name: 'Weekly Points', value: roguePoint, inline: true }
      //   );
      // if (notes.rogue_tourn_weekly_unlocked) {
      //   const bonusSynchronicity = `${notes.rogue_tourn_weekly_cur}/${notes.rogue_tourn_weekly_max}`;
      //   embed.addFields({
      //     name: 'Bonus Synchronicity Points',
      //     value: bonusSynchronicity,
      //     inline: true,
      //   });
      // }
      // embeds.push(embed);
    } else if (gameId === Games.HONKAI) {
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
      flags: MessageFlags.IsComponentsV2,
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
