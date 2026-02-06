// TODO
// Add support for STARRAIL (retcode -100)
import { ContainerBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { addEvent, getCookies, getUser, getUserLinkedGames } from '../db/queries.js';
import { fetchLedger } from '../hoyo/api/ledger.js';
import { Games } from '../hoyo/utils/constants.js';
import { zenlessRevenueStream } from '../hoyo/utils/constants.js';
import { fetchLinkedAccounts } from '../hoyo/utils/fetchLinkedAccounts.js';
import { createTextContainer } from '../utils/containerBuilder.js';
import { IncomeReportImage } from '../utils/emojis.js';
import { censorUid } from '../utils/privacy.js';

/** @typedef {import("../utils/typedef.js").GameID} GameID */

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default {
  cooldown: 30,
  data: new SlashCommandBuilder()
    .setName('income')
    .setDescription('View your in-game icome for the month.')
    .addStringOption((option) =>
      option
        .setName('account')
        .setDescription('The account to view the income for.')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('month')
        .setDescription('The month to view the income for.')
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

    if (focusedOption.name === 'account') {
      const { retcode, data } = await fetchLinkedAccounts(interaction.user.id, {
        exclude: [Games.STARRAIL, Games.HONKAI],
      });

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

    if (focusedOption.name === 'month') {
      const monthsToDisplay = getPreviousMonths(3);

      await interaction.respond(
        monthsToDisplay.map((month) => ({
          name: month.name,
          value: month.value,
        }))
      );
    }
  },
  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    // Get current month as fallback for month input
    const currentMonth = new Date().getMonth() + 1;

    // Fetch gameId and send initial feedback message
    const gameId = interaction.options.getString('account');
    const month = interaction.options.getString('month') || String(currentMonth);

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

    // Increment command usage count
    if (user.collectData) {
      await addEvent(interaction.user.id, {
        game: 'discord',
        type: 'interaction',
        metadata: {
          command: 'income',
          gameId: gameId,
          month: month,
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

    // Parse cookies and game info, stop user timer
    const cookies = await getCookies(interaction.user.id);
    const userFetchTime = Date.now() - startUserFetchTime;

    // Send querying message (successful account retrieval)
    const queryingContainer = createTextContainer(
      `Account successfully retrieved in ${userFetchTime}ms.\nFetching ledger from HoYoverse...`
    );
    await interaction.editReply({
      components: [queryingContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    // Fetch notes
    const startLedgerFetchTime = Date.now();

    const ledger = await fetchLedger(gameKey.gameRoleId, month, {
      gameId: /** @type {GameID} */ (gameKey.gameId),
      region: gameKey.region,
      cookies: cookies,
    });

    if (!ledger) {
      const container = createTextContainer(
        'An error occurred while fetching your data. Please try again later.'
      );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const ledgerFetchTime = Date.now() - startLedgerFetchTime;
    const ledgerContainer = createTextContainer(
      `Ledger retrieved in ${ledgerFetchTime}ms.\nPreparing your data...`
    );
    await interaction.editReply({
      components: [ledgerContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    const overviewContainer = new ContainerBuilder();

    if (gameKey.gameId === Games.GENSHIN) {
      const primogem = '<:UI_ItemIcon_201:1328873129560375377>';
      const mora = '<:UI_ItemIcon_202:1293962767388119111>';

      const { month_data, day_data } = ledger;
      const censoredUid = censorUid({ uid: ledger.uid, flag: user.private });

      overviewContainer.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              [
                `## Income Overview: ${getMonthName(parseInt(month, 10) - 1)}`,
                `-# ${ledger.nickname} | ${ledger.region} | ${censoredUid}`,
                `${primogem} Primogems: **${month_data.current_primogems}**`,
                `${mora} Mora: **${month_data.current_mora}**`,
              ].join('\n')
            )
          )
          .setThumbnailAccessory((thumbnail) =>
            thumbnail.setURL(IncomeReportImage[/** @type {"2" | "8"} */ (gameKey.gameId)])
          )
      );

      if (month_data.group_by && month_data.group_by.length > 0) {
        let summary = '';
        for (const group of month_data.group_by) {
          summary += `- ${group.action}: **${group.num}** Primogems\n`;
        }
        overviewContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(summary)
        );
      }

      const isCurrentMonth = parseInt(month, 10) === currentMonth;
      if (isCurrentMonth && day_data.current_primogems === 0) {
        overviewContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`Where did you venture off to today?\n`)
        );
      } else if (isCurrentMonth) {
        overviewContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `You have earned **${day_data.current_primogems}** Primogems and **${day_data.current_mora}** Mora today, what a bountiful day!\n`
          )
        );
      } else {
        /**
         * @param {number} rate
         * @returns {string}
         */
        const formatRate = (rate) =>
          rate < 0 ? `**${Math.abs(rate)}%** less` : `**${rate}%** more`;

        overviewContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `${formatRate(month_data.primogem_rate)} Primogems than last month, ${formatRate(month_data.mora_rate)} Mora than last month.\n`
          )
        );
      }

      if (month_data.group_by && month_data.group_by.length > 0) {
        const primarySource = findMaxByNum(month_data.group_by);
        if (primarySource) {
          overviewContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `This month, your primary source for obtaining Primogems is through **${primarySource.action}**, for a total of **${primarySource.num}** Primogems, or **${primarySource.percent}%** of your total.`
            )
          );
        }
      }

      overviewContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            '-# \*The data is delayed by about one hour, please check the updated records later',
            '-# \*This dairy only includes the resources obtained outside of top-ups',
          ].join('\n')
        )
      );
    } else if (gameKey.gameId === Games.ZZZ) {
      const emojiMap = {
        PolychromesData: '<:IconCurrency:1329116263137415198>',
        MatserTapeData: '<:iconmasterlarge:1329116309052592138>',
        BooponsData: '<:GachaTicket3:1329116283953745920>',
      };

      const { list, income_components } = ledger.month_data;
      const censoredUid = censorUid({ uid: ledger.uid, flag: user.private });

      const resourceSummary = list
        .map((/** @type {{ data_type: string, data_name: string, count: number }} */ item) => {
          const emoji = emojiMap[/** @type {keyof typeof emojiMap} */ (item.data_type)];
          return [emoji, item.data_name, `**${item.count}**`].filter(Boolean).join(' ');
        })
        .join('\n');

      overviewContainer.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              [
                `## Income Overview: ${getMonthName(parseInt(month, 10) - 1)}`,
                `-# ${ledger.role_info.nickname} | ${ledger.region} | ${censoredUid}`,
                resourceSummary,
              ].join('\n')
            )
          )
          .setThumbnailAccessory((thumbnail) =>
            thumbnail.setURL(IncomeReportImage[/** @type {"2" | "8"} */ (gameKey.gameId)])
          )
      );

      if (income_components && income_components.length > 0) {
        overviewContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            income_components
              .map(
                (/** @type {{ action: keyof typeof zenlessRevenueStream, num: number }} */ group) =>
                  `- ${zenlessRevenueStream[group.action]}: **${group.num}** Polychromes`
              )
              .join('\n')
          )
        );
      }

      if (income_components && income_components.length > 0) {
        const primarySource = findMaxByNum(income_components);
        if (primarySource) {
          overviewContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `This month, your primary source for obtaining Polychromes is through **${zenlessRevenueStream[/** @type {keyof typeof zenlessRevenueStream} */ (primarySource.action)]}**, for a total of **${primarySource.num}** Polychromes, or **${primarySource.percent}%** of your total.`
            )
          );
        }
      }

      overviewContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            '-# \*Please note that there is a delay of approximately 2 hours for data to be updated',
            '-# \*Polychromes exchanged using Monochromes are not counted as Polychrome revenue',
          ].join('\n')
        )
      );
    }

    await interaction.editReply({ components: [overviewContainer] });
  },
};

/**
 * Finds the item with the maximum `num` value in an array
 * @template {Record<string, any> & { num: number }} T
 * @param {T[]} items
 * @returns {T | undefined}
 */
const findMaxByNum = (items) => {
  if (!items || items.length === 0) {
    return undefined;
  }
  const maxNum = Math.max(...items.map((item) => item.num));
  return items.find((item) => item.num === maxNum);
};

/**
 * @param {number} count
 * @returns {Array<{ name: string, value: string }>}
 */
const getPreviousMonths = (count) => {
  const now = new Date();
  const currentMonth = now.getMonth();

  const months = [];
  for (let i = 0; i < count; i++) {
    const monthIndex = (currentMonth - i + 12) % 12;

    months.push({
      name: monthNames[monthIndex],
      value: String(monthIndex + 1),
    });
  }

  return months;
};

/**
 * @param {number} month
 * @returns {string}
 */
const getMonthName = (month) => {
  return monthNames[month];
};
