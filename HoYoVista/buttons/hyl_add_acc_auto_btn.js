const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, hyperlink } = require('discord.js');
const { embedColors } = require('../../config');

module.exports = {
    data: {
        id: 'hyl_add_acc_auto_btn',
        description: 'Add HoYoLAB Account (Auto)',
    },
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(embedColors.default)
            .setTitle('Instructions')
            .setDescription(`1. Login to ${hyperlink('HoYoLAB', 'https://www.hoyolab.com/home')}\n2. Go to your profile page\n3. Open the ${hyperlink('DevTools', 'https://balsamiq.com/support/faqs/browserconsole/')} on your respective browser\n4. Click on the \`Network\` tab and refresh the page (Ctrl+R or cmd+R)\n5. In the \`filter\` box, type "get" and click on the \`getGameRecordCard\`\n6. Go to the request headers section, find the Cookie, then copy the entire chunk of text.`);
        const cookieButton = new ButtonBuilder()
            .setCustomId('hyl_add_acc_auto_cookie_btn')
            .setLabel('Enter Cookies')
            .setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(cookieButton);
        await interaction.update({ embeds: [embed], components: [row] });
    },
}