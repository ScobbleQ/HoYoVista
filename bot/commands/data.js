const { SlashCommandBuilder, EmbedBuilder, codeBlock } = require('discord.js');
const { MongoDB } = require('../class/mongo');
const config = require('../../config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('data')
		.setDescription('Retrieves all data related to your account')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2]),
	async execute(interaction, dbClient) {
		const mongo = new MongoDB(dbClient, interaction.user.id);
		const user = await mongo.getUserData();

		if (!user) {
			return await interaction.reply({
				embeds: [new EmbedBuilder()
					.setColor(config.embedColors.error)
					.setDescription('You don\'t have any data stored yet.'),
				],
				ephemeral: true,
			});
		}

		const { stoken, ltoken_v2, ltuid_v2, ltmid_v2 } = user.hoyolab;

		const embed = new EmbedBuilder()
			.setColor(config.embedColors.default)
			.addFields(
				{ name: '_id', value: codeBlock(user._id).toString(), inline: true },
				{ name: 'Joined At', value: `<t:${Math.floor(user.joinedAt / 1000)}:f>`, inline: true },
				{ name: 'stoken', value: codeBlock(stoken), inline: false },
				{ name: 'ltoken_v2', value: codeBlock(ltoken_v2), inline: false },
				{ name: 'ltuid_v2', value: codeBlock(ltuid_v2), inline: false },
				{ name: 'ltmid_v2', value: codeBlock(ltmid_v2), inline: false },
			)
			.setTimestamp()
			.setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

		await interaction.reply({ embeds: [embed], ephemeral: true });
	},
};