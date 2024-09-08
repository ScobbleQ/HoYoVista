const { EmbedBuilder } = require('discord.js');
const { embedColors } = require('../../config');

module.exports = {
	data: {
		id: 'help_ios',
		description: 'Brings up the instructions for HoYoLAB linking on iOS devices',
	},
	async execute(interaction) {
		const instructions =
            '1. Open the HoYoLAB app and input your Username/Email and Password, then click on the two consent buttons. Do **NOT** click on the Log In button yet.\n' +
            '2. Return to your home screen and open \'Network Sniffer\' and follow their instructions on setting up the configurations.\n' +
            '3. On the Home page of \'Network Sniffer\', click on the \'Start\' button at the top and then click on the \'Log In\' button on the HoYoLAB app.\n' +
            '4. Once you have successfully logged in, wait 10 seconds before returning to \'Network Sniffer\' and click on the \'Stop\' button at the top.\n' +
            '5. Go to the Record page and click on the most recent record.\n' +
            '6. At the top, enter \'SToken\' in the search bar - this should narrow it down to only one options.\n' +
            '7. Click on the option that contains the same URL: `https://sg-public-api.hoyoverse.com/account/ma-passport/token/getBySToken`\n' +
            '8. Scroll down to the bottom and press the Cookie section and select \'Copy Value\' [Make sure the format is `stoken=__;mid=__`].\n' +
            '9. Return to Discord, press on \'Enter Cookies\', and paste the cookies into the text field.';

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setColor(embedColors.default)
				.setTitle('iOS Instructions')
				.setDescription(instructions),
			],
			ephemeral: true,
		});
	},
};