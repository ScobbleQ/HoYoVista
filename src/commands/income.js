import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { embedColors } from '../../config.js';
import { MongoDB } from '../class/mongo.js';
import { fetchLinkedAccount } from '../hoyolab/fetchLinkedAccount.js';
import { createEmbed } from '../utils/createEmbed.js';
import { fetchLedger } from '../hoyolab/fetchLedger.js';
import { Game } from '../hoyolab/constants.js';
import { zenlessRevenueStream } from '../hoyolab/gameConstants.js';

// TODO
// add support for STARRAIL (retcode -100)

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
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'account') {
            const { retcode, message, data } = await fetchLinkedAccount(interaction.user.id, {
                exclude: [Game.STARRAIL, Game.HONKAI],
            });

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
    async execute(interaction) {
        // fetch gameId and send initial feedback message
        const gameId = interaction.options.getString('account');
        const month = interaction.options.getString('month');
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
            `Account successfully retrieved in ${userFetchTime}ms.\nFetching ledger from HoYoverse...`,
            embedColors.warning
        );
        await interaction.editReply({ embeds: [queryingEmbed] });

        // fetch notes
        const startLedgerFetchTime = Date.now();
        const ledgerData = await fetchLedger(
            month,
            { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang },
            { game_id, region, game_role_id }
        );

        // notes failed
        if (ledgerData.retcode !== 1) {
            const errorEmbed = createEmbed(ledgerData.message);
            return interaction.editReply({ embeds: [errorEmbed] });
        }

        // notes retrieved, prepare embeds to send
        const ledger = ledgerData.data.data;
        const ledgerFetchTime = Date.now() - startLedgerFetchTime;
        const ledgerEmbed = createEmbed(
            `Ledger retrieved in ${ledgerFetchTime}ms.\nPreparing your data...`,
            embedColors.warning
        );
        await interaction.editReply({ embeds: [ledgerEmbed] });

        const embed = new EmbedBuilder()
            .setColor(embedColors.primary)
            .setTitle(`Income Overview: ${getMonthName(month - 1)}`);

        let summary;
        if (gameId === Game.GENSHIN) {
            const primogem = '<:UI_ItemIcon_201:1328873129560375377>';
            const mora = '<:UI_ItemIcon_202:1293962767388119111>';
            const { current_primogems, current_mora, primogem_rate, mora_rate, group_by } = ledger.month_data;
            const { current_primogems: dayPrimogems, current_mora: dayMora } = ledger.day_data;

            summary = `${primogem} Primogems: **${current_primogems}**\n${mora} Mora: **${current_mora}**\n\n`;

            // add primogem distrubution
            if (group_by?.length) {
                summary += group_by.map(({ action, num }) => `- ${action}: **${num}** Primogems`).join('\n') + '\n\n';
            }

            // if current month and no income, display generic message
            // if current month, display daily income
            // if previous month, display difference in income
            const isCurrentMonth = String(ledger.data_month) === String(new Date().getMonth() + 1);
            if (isCurrentMonth && dayPrimogems === 0) {
                summary += `Where did you venture off to today?\n`;
            } else if (isCurrentMonth) {
                summary += `You have earned **${dayPrimogems}** Primogems and **${dayMora}** Mora today, what a bountiful day!\n`;
            } else {
                const formatRate = (rate) => (rate < 0 ? `**${Math.abs(rate)}%** less` : `**${rate}%** more`);
                summary += `${formatRate(primogem_rate)} Primogems than last month, ${formatRate(mora_rate)} Mora than last month.\n`;
            }

            // get primary source of income
            const primarySource = group_by?.reduce((max, group) => (group.num > max.num ? group : max), {
                action: 'unknown',
                num: 0,
                percent: 0,
            }) || { action: 'unknown', num: 0, percent: 0 };

            summary += `This month, your primary source for obtaining Primogems is through **${primarySource.action}**, for a total of **${primarySource.num}** Primogems, or **${primarySource.percent}%** of your total.`;
        } else if (gameId === Game.ZZZ) {
            const emojiMap = {
                PolychromesData: '<:IconCurrency:1329116263137415198>',
                MatserTapeData: '<:iconmasterlarge:1329116309052592138>',
                BooponsData: '<:GachaTicket3:1329116283953745920>',
            };

            const { list, income_components } = ledger.month_data;

            // get resource summary
            const resourceSummary = Object.entries(emojiMap)
                .map(([dataType, emoji]) => {
                    const data = list.find((item) => item.data_type === dataType);
                    return data ? `${emoji} ${data.data_name}: **${data.count}**` : null;
                })
                .filter(Boolean)
                .join('\n');

            // get polychrome distribution
            const incomeSummary =
                income_components
                    .map(({ action, num }) => `- ${zenlessRevenueStream[action]}: **${num}** Polychromes`)
                    .join('\n') + '\n\n';

            summary = `${resourceSummary}\n\n${incomeSummary}`;

            // get primary source of income
            const primarySource = income_components?.reduce((max, group) => (group.num > max.num ? group : max), {
                action: 'unknown',
                num: 0,
                percent: 0,
            }) || { action: 'unknown', num: 0, percent: 0 };

            summary += `This month, your primary source for obtaining Polychromes is through **${zenlessRevenueStream[primarySource.action]}**, for a total of **${primarySource.num}** Polychromes, or **${primarySource.percent}%** of your total.`;
        }

        embed.setDescription(summary);

        await interaction.editReply({ embeds: [embed] });
    },
};

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

const getMonthName = (month) => {
    return monthNames[month];
};
