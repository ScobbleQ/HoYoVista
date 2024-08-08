const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, hyperlink } = require('discord.js');
const { embedColors } = require('../../config');

module.exports = {
    data: {
        id: 'hyl_add_acc_manual_btn',
        description: 'Add HoYoLAB Account (Manual)',
    },
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(embedColors.default)
            .setTitle('Instructions')
            .setDescription(`1. Login to ${hyperlink('HoYoLAB', 'https://www.hoyolab.com/home')}\n2. Open the ${hyperlink('DevTools', 'https://balsamiq.com/support/faqs/browserconsole/')} on your respective browser\n3. Click on the \`Application\` tab then click on the \`Cookies\` tab on your left sidebar.\n4. In the \`filter\` box, type "v2"\n5. Copy the \`Value\` of each cookie carefully and paste them into the boxes.`);
        const cookieButton = new ButtonBuilder()
            .setCustomId('hyl_add_acc_manual_cookie_btn')
            .setLabel('Enter Cookies')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(cookieButton);

        await interaction.update({ embeds: [embed], components: [row] });
    },
}