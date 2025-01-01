import { SlashCommandBuilder } from 'discord.js';
import { embedColors } from '../../config.js';
import { fetchLinkedAccount } from '../hoyolab/fetchLinkedAccount.js';
import { MongoDB } from '../class/mongo.js';
import { createEmbed } from '../utils/createEmbed.js';
import { Game } from '../hoyolab/constants.js';
import { redeemCode } from '../hoyolab/redeem.js';

export default {
	data: new SlashCommandBuilder()
		.setName('redeem')
		.setDescription('Settings')
		.addStringOption(option => option
			.setName('account')
			.setDescription('The account to redeem code for.')
			.setRequired(false)
			.setAutocomplete(true))
		.addStringOption(option => option
			.setName('code')
			.setDescription('The code to redeem seperated by -,|/:')
			.setRequired(false))
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2]),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);
		const { retcode, message, data } = await fetchLinkedAccount(interaction.user.id, { exclude: [Game.STARRAIL] });

		if (focusedOption.name === 'account') {
			if (retcode !== 1 || !data) {
				return await interaction.respond([{ name: message, value: '-1' }]);
			}

			const filtered = data.filter(choice =>
				choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()),
			);

			await interaction.respond(
				filtered.map(choice => ({
					name: choice.name,
					value: choice.id,
				})),
			);
		}
	},
	async execute(interaction) {
		await interaction.deferReply();

		// fetch gameId and send initial feedback message
		const gameId = interaction.options.getString('account') || '0';
		const codes = interaction.options.getString('code') || '';
		const fetchingEmbed = createEmbed('Retrieving your data. Please wait...', embedColors.warning);
		await interaction.editReply({ embeds: [fetchingEmbed] });

		// fetch user data from MongoDB
		const startUserFetchTime = Date.now();
		const mongo = MongoDB.getInstance();
		const { retcode, data: user } = await mongo.getUserData(interaction.user.id);

		// no account
		if (retcode === -1) {
			const embed = createEmbed('You are not registered. Please use the `/register` command to create an account.');
			return interaction.editReply({ embeds: [embed] });
		}

		// increment command usage count, account confirmed
		if (user.settings.collect_data) {
			mongo.increment(interaction.user.id, { field: 'stats.command_used', value: 1 });
		}

		// error code OR no linked games
		if (gameId === '-1' || !user.linked_games) {
			const embed = createEmbed('Link your hoyolab account to redeem codes.');
			return interaction.editReply({ embeds: [embed] });
		}

		const gamesToRedeem = gameId === '0'
			? Object.values(user.linked_games).map(game => game.game_id)
			: [gameId];
		const userFetchTime = Date.now() - startUserFetchTime;

		// send querying message (successful account retrieval)
		const queryingEmbed = createEmbed(`Account successfully retrieved in ${userFetchTime}ms.\nPerforming redemption...`, embedColors.warning);
		await interaction.editReply({ embeds: [queryingEmbed] });

		const redeem = await redeemCode(interaction.user.id, {
			arrayOfGameId: gamesToRedeem,
			hoyolabCookies: user.hoyolab_cookies,
			linkedGames: user.linked_games,
			isPrivate: user.settings.is_private,
			toNotify: user.settings.to_notify_redeem,
			automatic: false,
		});

		if (user.settings.collect_data) {
		    mongo.increment(interaction.user.id, { field: 'stats.total_redeem', value: redeem.amount });
		}

		if (redeem.embeds.length === 0) {
			const embed = createEmbed('No new codes found.');
			return interaction.editReply({ embeds: [embed] });
		}

		await interaction.editReply({ embeds: redeem.embeds });
	},
};