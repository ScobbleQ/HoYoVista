const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: {
        id: 'hyl_add_acc_manual_cookie_btn',
        description: 'Bring up the HoYoLAB Account Manual Adder Modal',
    },
    async execute(interaction) {
        const addAccount = new ModalBuilder()
            .setCustomId('hyl_add_acc_manual_cookie_modal')
            .setTitle('Enter Cookies')
        const ltuid_v2 = new TextInputBuilder()
            .setCustomId('hyl_acc_cookies_ltuid_v2')
            .setLabel('ltuid_v2')
            .setPlaceholder('Paste your ltuid_v2 here....')
            .setStyle(TextInputStyle.Short);
        const ltoken_v2 = new TextInputBuilder()
            .setCustomId('hyl_acc_cookies_ltoken_v2')
            .setLabel('ltoken_v2')
            .setPlaceholder('Paste your ltoken_v2 here....')
            .setStyle(TextInputStyle.Short);

        const row1 = new ActionRowBuilder().addComponents(ltuid_v2);
        const row2 = new ActionRowBuilder().addComponents(ltoken_v2);
        addAccount.addComponents(row1, row2);

        await interaction.showModal(addAccount);
    },
}