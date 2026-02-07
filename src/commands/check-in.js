import { ContainerBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { addEvent, getCookies, getUser, getUserLinkedGames } from '../db/queries.js';
import { fetchCheckin } from '../hoyo/api/checkin.js';
import { IdToFull } from '../hoyo/utils/constants.js';
import { fetchLinkedAccounts } from '../hoyo/utils/fetchLinkedAccounts.js';
import { createTextContainer } from '../utils/containerBuilder.js';
import { plural } from '../utils/plural.js';
import { censorUid } from '../utils/privacy.js';

/** @typedef {import("../utils/typedef.js").GameID} GameID */

export default {
  cooldown: 1800, // 30 minutes
  data: new SlashCommandBuilder()
    .setName('check-in')
    .setDescription('Daily check-in from HoYoLAB')
    .addStringOption((option) =>
      option
        .setName('account')
        .setDescription('The account to check-in for.')
        .setRequired(false)
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
    if (retcode !== 1 || !data) {
      return await interaction.respond([{ name: 'No supported linked games found', value: '-1' }]);
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
  },
  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    await interaction.deferReply();
    const gameId = interaction.options.getString('account') || '0';

    // Fetch user data
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

    // Increment command usage count (only in production)
    if (user.collectData) {
      await addEvent(interaction.user.id, {
        game: 'discord',
        type: 'interaction',
        metadata: {
          command: 'check-in',
          gameId: gameId,
        },
      });
    }

    // Fetch linked games
    const linkedGames = await getUserLinkedGames(interaction.user.id);
    if (!linkedGames) {
      const container = createTextContainer(
        'No linked games found. Please use the `/hoyolink` command to link your Hoyolab account.'
      );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    // Fetch cookies
    const cookies = await getCookies(interaction.user.id);
    if (!cookies) {
      const container = createTextContainer(
        'No cookies found. Please use the `/hoyolink` command to link your Hoyolab account.'
      );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    // Check-in for all linked games
    if (gameId === '0') {
      const checkinContainer = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`# Checkin Summary\n-# <t:${Math.floor(Date.now() / 1000)}:F>`)
        )
        .addSeparatorComponents((separator) => separator);

      for (let i = 0; i < linkedGames.length; i++) {
        const game = linkedGames[i];
        const gameName = IdToFull[game.gameId];
        const checkin = await fetchCheckin(/** @type {GameID} */ (game.gameId), { cookies });

        if (!checkin || checkin.status === 'Failed') {
          checkinContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              [
                `### ${gameName} (${censorUid({ uid: game.gameRoleId, flag: user.private })})`,
                `Failed to check-in with code \`${checkin?.retcode}\``,
                checkin?.message,
              ].join('\n')
            )
          );
        } else if (checkin.status === 'SuccessNoDetails') {
          if (user.collectData) {
            await addEvent(interaction.user.id, {
              game: game.gameId,
              type: 'checkin',
            });
          }

          checkinContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              [
                `### ${gameName} (${censorUid({ uid: game.gameRoleId, flag: user.private })})`,
                'Daily Check-in Claimed',
                '-# No checkin details available',
              ].join('\n')
            )
          );
        } else {
          if (user.collectData) {
            await addEvent(interaction.user.id, {
              game: game.gameId,
              type: 'checkin',
              metadata: {
                reward: checkin.award.name,
                amount: checkin.award.cnt,
              },
            });
          }

          checkinContainer.addSectionComponents((section) =>
            section
              .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                  [
                    `### ${gameName} (${censorUid({ uid: game.gameRoleId, flag: user.private })})`,
                    'Daily Check-in Claimed',
                    `${checkin.award.name} x${checkin.award.cnt}`,
                    checkin.missedDays > 0
                      ? `-# Missed ${checkin.missedDays} ${plural(checkin.missedDays, 'day')}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join('\n')
                )
              )
              .setThumbnailAccessory((thumbnail) => thumbnail.setURL(checkin.award.icon))
          );
        }

        // Add separator between games
        if (i < linkedGames.length - 1) {
          checkinContainer.addSeparatorComponents((separator) => separator);
        }
      }

      await interaction.editReply({
        components: [checkinContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    // Find the target game
    const gameKey = linkedGames.find((g) => g.gameId === gameId);
    if (!linkedGames || !gameKey) {
      const container = createTextContainer(
        'None of your linked games are supported for this command.'
      );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
      return;
    }

    // Fetch check-in for the target game
    const checkin = await fetchCheckin(/** @type {GameID} */ (gameKey.gameId), { cookies });
    const gameName = IdToFull[gameKey.gameId];

    if (!checkin || checkin.status === 'Failed') {
      const container = createTextContainer(
        [
          `### ${gameName} (${censorUid({ uid: gameKey.gameRoleId, flag: user.private })})`,
          `Failed to check-in with code \`${checkin?.retcode}\``,
          checkin?.message,
        ].join('\n')
      );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    if (checkin.status === 'SuccessNoDetails') {
      if (user.collectData) {
        await addEvent(interaction.user.id, {
          game: gameKey.gameId,
          type: 'checkin',
        });
      }

      const container = createTextContainer(
        [
          `### ${gameName} (${censorUid({ uid: gameKey.gameRoleId, flag: user.private })})`,
          'Daily Check-in Claimed',
          '-# No checkin details available',
        ].join('\n')
      );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    if (user.collectData) {
      await addEvent(interaction.user.id, {
        game: gameKey.gameId,
        type: 'checkin',
        metadata: {
          reward: checkin.award.name,
          amount: checkin.award.cnt,
        },
      });
    }

    const container = new ContainerBuilder().addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            [
              `### ${gameName} (${censorUid({ uid: gameKey.gameRoleId, flag: user.private })})`,
              'Daily Check-in Claimed',
              `${checkin.award.name} x${checkin.award.cnt}`,
              checkin.missedDays > 0
                ? `-# Missed ${checkin.missedDays} ${plural(checkin.missedDays, 'day')}`
                : '',
            ]
              .filter(Boolean)
              .join('\n')
          )
        )
        .setThumbnailAccessory((thumbnail) => thumbnail.setURL(checkin.award.icon))
    );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
