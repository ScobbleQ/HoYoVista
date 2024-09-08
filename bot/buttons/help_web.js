const { EmbedBuilder, hyperlink } = require('discord.js');
const { embedColors } = require('../../config');

module.exports = {
	data: {
		id: 'help_web',
		description: 'Bring up the instructions for HoYoLAB linking on web browers',
	},
	async execute(interaction) {
		const instructions =
            `1. Open the ${hyperlink('HoYoLAB', 'https://www.hoyolab.com/home')} website and log in to your account.\n` +
            '2. Click on your profile picture and select \'Personal Homepage\'.\n' +
            `3. Open the ${hyperlink('DevTools', 'https://balsamiq.com/support/faqs/browserconsole/')} on your respective browser\n` +
            '4. Click on the `Network` tab and refresh the page (Ctrl+R or cmd+R)\n' +
            '5. In the `filter` box, type `getGame` and click on the `getGameRecordCard`\n' +
            '6. Go to the REQUEST section, find the Cookie, then copy the entire chunk of text after `Cookie:`.\n' +
            '7. Return to Discord, press on \'Enter Cookies\', and paste the cookies into the text field.';

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setColor(embedColors.default)
				.setTitle('Web Instructions')
				.setDescription(instructions)
				.setFooter({ text: 'Tested on Chrome, Edge, and Safari.' }),
			],
			ephemeral: true,
		});
	},
};