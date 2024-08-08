const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { embedColors } = require('../../config');

module.exports = {
    data: {
        id: 'hyl_add_acc_btn',
        description: 'Add HoYoLAB Account',
    },
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(embedColors.default)
            .setTitle('Select a Method to add Your acc')
            .setDescription(`Note: These method should work on all major browsers. Tested on Chrome, Edge, and Safari.\n\n1. Manual DevTools: Manually copy each cookie from your browser's DevTools\n2. Auto DevTools: Automatically fetch your cookies from your browser's DevTools\n\nOption 1 is easier to get your cookies, but Option 2 is faster.`);

        const option1 = new ButtonBuilder()
            .setCustomId('hyl_add_acc_manual_btn')
            .setLabel('Manual DevTools')
            .setStyle(ButtonStyle.Primary);

        const option2 = new ButtonBuilder()
            .setCustomId('hyl_add_acc_auto_btn')
            .setLabel('Auto DevTools')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(option1, option2);
        await interaction.update({ embeds: [embed], components: [row] });
    },
}