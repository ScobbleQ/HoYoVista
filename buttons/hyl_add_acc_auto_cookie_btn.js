const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: {
        id: 'hyl_add_acc_auto_cookie_btn',
        description: 'Bring up the HoYoLAB Account Auto Adder Modal',
    },
    async execute(interaction) {
        const addAccount = new ModalBuilder()
            .setCustomId('hyl_add_acc_auto_cookie_modal')
            .setTitle('Enter Cookies')
        const addaccCookies = new TextInputBuilder()
            .setCustomId('hyl_acc_cookies')
            .setLabel('Cookies')
            .setPlaceholder('Paste your cookies here....')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(2000);
        const row = new ActionRowBuilder().addComponents(addaccCookies);
        addAccount.addComponents(row);
        await interaction.showModal(addAccount);
    },
}