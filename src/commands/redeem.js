// NEED TO FIX
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { addEvent, getCookies, getUser, getUserLinkedGames } from '../db/queries.js';
import { redeemCode } from '../hoyo/api/redeem.js';
import { Games } from '../hoyo/utils/constants.js';
import { fetchLinkedAccounts } from '../hoyo/utils/fetchLinkedAccounts.js';
import { fetchSeriaCodes } from '../hoyo/utils/fetchSeriaCodes.js';
import { createTextContainer } from '../utils/containerBuilder.js';

export default {
  cooldown: 60,
  data: new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('Redeem codes for in-game rewards')
    .addStringOption((option) =>
      option
        .setName('account')
        .setDescription('The account to redeem code for.')
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('code')
        .setDescription('The code to redeem seperated by -,|/:')
        .setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /**
   * @param {import("discord.js").AutocompleteInteraction} interaction
   * @returns {Promise<void>}
   */
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const { retcode, data } = await fetchLinkedAccounts(interaction.user.id, {
      exclude: [Games.HONKAI],
    });

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
    await interaction.reply({
      content: 'This command is currently under maintenance.',
      flags: [MessageFlags.Ephemeral],
    });
    return;

    // await interaction.deferReply();

    // // fetch gameId and send initial feedback message
    // const gameId = interaction.options.getString('account') || '0';
    // const codes = interaction.options.getString('code') || '';

    // const user = await getUser(interaction.user.id);
    // if (!user) {
    //   const container = createTextContainer(
    //     'You are not registered. Please use the `/register` command to create an account.'
    //   );
    //   await interaction.editReply({
    //     components: [container],
    //     flags: MessageFlags.IsComponentsV2,
    //   });
    //   return;
    // }

    // if (user.collectData) {
    //   await addEvent(interaction.user.id, {
    //     game: 'discord',
    //     type: 'interaction',
    //     metadata: { command: 'redeem', gameId: gameId, codes: codes },
    //   });
    // }

    // const linkedGames = await getUserLinkedGames(interaction.user.id);
    // const gameKey = linkedGames.find((g) => g.gameId === gameId);
    // if (!linkedGames || !gameKey) {
    //   const container = createTextContainer(
    //     'None of your linked games are supported for this command.'
    //   );
    //   await interaction.editReply({
    //     components: [container],
    //     flags: MessageFlags.IsComponentsV2,
    //   });
    //   return;
    // }

    // const cookies = await getCookies(interaction.user.id);
    // if (!cookies) {
    //   const container = createTextContainer(
    //     'No cookies found. Please use the `/hoyolink` command to link your Hoyolab account.'
    //   );
    //   await interaction.editReply({
    //     components: [container],
    //     flags: MessageFlags.IsComponentsV2,
    //   });
    //   return;
    // }

    // const redeem = await redeemCode(interaction.user.id, codes, {
    //   arrayOfGameId: [gameKey.gameId],
    //   hoyolabCookies: cookies,
    //   linkedGames: gameKey,
    //   isPrivate: user.private,
    //   toNotify: user.notifyRedeem,
    //   collectData: user.collectData,
    //   automatic: false,
    // });

    // const fetchingEmbed = warningEmbed({ message: 'Retrieving your data. Please wait...' });
    // await interaction.editReply({ embeds: [fetchingEmbed] });

    // // fetch user data from MongoDB
    // const startUserFetchTime = Date.now();
    // const mongo = MongoDB.getInstance();
    // const { retcode, data: user } = await mongo.getUserData(interaction.user.id);

    // // no account
    // if (retcode === -1) {
    //   const embed = errorEmbed({
    //     message: 'You are not registered. Please use the `/register` command to create an account.',
    //   });
    //   return interaction.editReply({ embeds: [embed] });
    // }

    // // increment command usage count, account confirmed
    // if (user.settings.collect_data) {
    //   await addEvent(interaction.user.id, {
    //     game: 'discord',
    //     type: 'interaction',
    //     metadata: {
    //       command: 'redeem',
    //       gameId: gameId,
    //       codes: codes,
    //     },
    //   });
    // }

    // // error code OR no linked games
    // if (gameId === '-1' || !user.linked_games) {
    //   const embed = errorEmbed({ message: 'Link your hoyolab account to redeem codes.' });
    //   return interaction.editReply({ embeds: [embed] });
    // }

    // const gamesToRedeem =
    //   gameId === '0' ? Object.values(user.linked_games).map((game) => game.game_id) : [gameId];
    // const userFetchTime = Date.now() - startUserFetchTime;

    // // send querying message (successful account retrieval)
    // const queryingEmbed = warningEmbed({
    //   message: `Account successfully retrieved in ${userFetchTime}ms.\nPerforming redemption...`,
    // });
    // await interaction.editReply({ embeds: [queryingEmbed] });

    // let availableCodes;
    // try {
    //   availableCodes = await fetchSeriaCodes();
    // } catch {
    //   const embed = errorEmbed({ message: 'We are unable to get codes' });
    //   return interaction.editReply({ embeds: [embed] });
    // }

    // const redeem = await redeemCode(interaction.user.id, availableCodes, {
    //   arrayOfGameId: gamesToRedeem,
    //   hoyolabCookies: user.hoyolab_cookies,
    //   linkedGames: user.linked_games,
    //   isPrivate: user.settings.is_private,
    //   toNotify: user.settings.to_notify_redeem,
    //   automatic: false,
    // });

    // if (user.settings.collect_data) {
    //   mongo.increment(interaction.user.id, {
    //     field: 'stats.total_redeem',
    //     value: redeem.amount,
    //   });
    // }

    // if (redeem.embeds.length === 0) {
    //   const embed = errorEmbed({ message: 'No new codes found.' });
    //   return interaction.editReply({ embeds: [embed] });
    // } else if (redeem.embeds.length > 10) {
    //   // chunk embeds if more than 10?
    //   const embed = primaryEmbed({
    //     message: 'Too many codes to display. Check the codes using [/data]',
    //   });
    //   return interaction.editReply({ embeds: [embed] });
    // }

    // await interaction.editReply({ embeds: redeem.embeds });
  },
};
