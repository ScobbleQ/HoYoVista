const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { embedColors } = require('../../config');

module.exports = {
    data: {
        id: 'hyl_add_acc_btn',
        description: 'Add HoYoLAB Account',
    },
    async execute(interaction) {
        const description = 
            "Select a method to add your HoYoLAB account. If you are unsure, press the 'Help Me Decide' button.\n\n" +
            "Some features may be disabled depending on the method you choose, view 'Help Me Decide' for more details.";
            
        const embed = new EmbedBuilder()
            .setColor(embedColors.default)
            .setTitle('HoYoLAB Cookies')
            .setDescription(description);

        const cookies = new ButtonBuilder()
            .setLabel('Enter Cookies')
            .setCustomId('hyl_add_acc_cookies_btn')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('<:Cookies:1276999400232718410>');
        const help = new ButtonBuilder()
            .setLabel('Help Me Decide')
            .setCustomId('help_cookies')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('<:Comments:1276999972172206111>');

        const web = new ButtonBuilder()
            .setLabel('Web')
            .setCustomId('web_button')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('<:Web:1276994993092952155>')
            .setDisabled(true);
        const web_hoyolab = new ButtonBuilder()
            .setLabel('HoYoLAB')
            .setURL('https://www.hoyolab.com/home')
            .setStyle(ButtonStyle.Link);
        const web_sniffer = new ButtonBuilder()
            .setLabel('DevTools')
            .setURL('https://balsamiq.com/support/faqs/browserconsole/')
            .setStyle(ButtonStyle.Link);
        const web_help = new ButtonBuilder()
            .setLabel('Help')
            .setCustomId('help_web')
            .setStyle(ButtonStyle.Secondary);

        const iOS = new ButtonBuilder()
            .setLabel('iOS')
            .setCustomId('ios_button')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('<:AppleIcon:1277805639854325862>')
            .setDisabled(true);
        const hoyolab = new ButtonBuilder()
            .setLabel('HoYoLAB')
            .setURL('https://apps.apple.com/us/app/hoyolab/id1559483982')
            .setStyle(ButtonStyle.Link);
        const iOS_sniffer = new ButtonBuilder()
            .setLabel('Network Sniffer')
            .setURL('https://apps.apple.com/us/app/network-sniffer/id6450956188')
            .setStyle(ButtonStyle.Link);
        const iOS_help = new ButtonBuilder()
            .setLabel('Help')
            .setCustomId('help_ios')
            .setStyle(ButtonStyle.Secondary);

        const android = new ButtonBuilder()
            .setLabel('Android')
            .setCustomId('android_button')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('<:AndroidIcon:1277805652630044793>')
            .setDisabled(true);
        const android_hoyolab = new ButtonBuilder()
            .setLabel('HoYoLAB')
            .setURL('https://play.google.com/store/apps/details?id=com.mihoyo.hoyolab')
            .setStyle(ButtonStyle.Link)
            .setDisabled(true);
        const android_sniffer = new ButtonBuilder()
            .setLabel('App')
            .setURL('https://play.google.com/store/apps/details?id=app.greyshirts.sslcapture')
            .setStyle(ButtonStyle.Link)
            .setDisabled(true);
        const android_help = new ButtonBuilder()
            .setLabel('Help')
            .setCustomId('help_android')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const cookies_row = new ActionRowBuilder().addComponents(cookies, help);
        const web_row = new ActionRowBuilder().addComponents(web, web_hoyolab, web_sniffer, web_help);
        const iOS_row = new ActionRowBuilder().addComponents(iOS, hoyolab, iOS_sniffer, iOS_help);
        const android_row = new ActionRowBuilder().addComponents(android, android_hoyolab, android_sniffer, android_help);

        await interaction.update({ embeds: [embed], components: [cookies_row, web_row, iOS_row, android_row] });
    },
}