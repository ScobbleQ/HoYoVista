import { SlashCommandBuilder } from 'discord.js';
import { MongoDB } from '../class/mongo.js';
import { createEmbed } from '../utils/createEmbed.js';
import { embedColors } from '../../config.js';

export default {
	data: new SlashCommandBuilder()
		.setName('data')
		.setDescription('Retrieve and view your account data.')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2]),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		const mongo = MongoDB.getInstance();
		const { retcode, data } = await mongo.getUserData(interaction.user.id);

		if (retcode === -1) {
			const embed = createEmbed('You are not registered. Please use the `/register` command to create an account.');
			return interaction.editReply({ embeds: [embed] });
		}

		if (data.settings.collect_data) {
			mongo.increment(interaction.user.id, { field: 'stats.command_used', value: 1 });
		}
		const formattedData = JSON.stringify(data, null, 2);

		const embed = createEmbed(`\`\`\`json\n${formattedData}\n\`\`\``, embedColors.primary);
		await interaction.editReply({ embeds: [embed] });
	},
};