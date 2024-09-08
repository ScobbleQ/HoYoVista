const { EmbedBuilder } = require('discord.js');
const { embedColors } = require('../../config');

module.exports = {
	data: {
		id: 'help_cookies',
		description: 'Provides help to get cookies from HoYoLAB',
	},
	async execute(interaction) {
		const instructions =
            'Currently every feature is supported regardless of method used.\n';
		'iOs method has access to SToken, which is future proof for new features.\n\n';
		'Since every feature is supported, we recommend using the method you are most comfortable with.\n';

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setColor(embedColors.default)
				.setTitle('Help Me Decide')
				.setDescription(instructions)
				.setFooter({ text: 'Still feeling unsure? Use /feedback and we will personally assist you!' }),
			],
			ephemeral: true,
		});
	},
};