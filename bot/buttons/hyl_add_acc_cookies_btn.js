const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
	data: {
		id: 'hyl_add_acc_cookies_btn',
		description: 'Bring up the HoYoLAB Account Manual Adder Modal',
	},
	async execute(interaction) {
		const addAccount = new ModalBuilder()
			.setCustomId('hyl_add_acc_cookies_modal')
			.setTitle('Enter Cookies');
		const ltuid_v2 = new TextInputBuilder()
			.setCustomId('hyl_acc_cookies')
			.setLabel('Cookies')
			.setPlaceholder('Enter your cookies here')
			.setStyle(TextInputStyle.Paragraph);

		const row1 = new ActionRowBuilder().addComponents(ltuid_v2);
		addAccount.addComponents(row1);

		await interaction.showModal(addAccount);
	},
};