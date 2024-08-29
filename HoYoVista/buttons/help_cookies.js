const { EmbedBuilder, hyperlink } = require('discord.js');
const { embedColors } = require('../../config');

module.exports = {
    data: {
        id: 'help_cookies',
        description: 'Provides help to get cookies from HoYoLAB',
    },
    async execute(interaction) {
        const instructions =
            "`1. Is your only HoYoVerse game Genshin Impact?`\n" +
            "If you answered yes, use the '<:Web:1276994993092952155> Web' instructions.\n" +
            "`2. Do you play either Honkai: Star Rail or Zenless Zone Zero`\n" +
            "If you answered no, use the '<:Web:1276994993092952155> Web' instructions.\n" +
            "`3. Do you want every feature this bot offers (auto code redemption and others soon)`\n" + 
            "If you answered yes, use the '<:AppleIcon:1277805639854325862> iOS' instructions.\n\n" +
            "### FAQ ###\n" +
            "Q: What is the difference between Web and iOS cookies?\n" +
            "A: iOS cookies contain SToken which is vital for some tasks, web cookies does not have the SToken.\n\n" +
            "Q: Why is the Android row disabled?\n" +
            "A: We have yet to find a way to make it work. If you know a way or want to help the development, feel free to use `/feedback` to contact us!\n\n";

        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(embedColors.default)
                .setTitle('Help Me Decide')
                .setDescription(instructions)
                .setFooter({ text: 'Still feeling unsure? Use /feedback and we will personally assist you!' })
            ],
            ephemeral: true
        });
    },
}