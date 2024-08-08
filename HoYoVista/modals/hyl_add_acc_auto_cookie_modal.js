const { EmbedBuilder } = require('discord.js');
const { checkIfUserExists, addUserToDatabase } = require('../utils/mongo');
const { parseHoyolabInfo } = require('../utils/parseHoyolabInfo');
const { embedColors } = require('../../config');

module.exports = {
    data: {
        id: 'hyl_add_acc_auto_cookie_modal',
        description: 'Add HoYoLAB Account (Auto)',
    },
    async execute(interaction, dbClient) {
        const cookies = interaction.fields.getTextInputValue('hyl_acc_cookies');

        // Check again if the user exists in the database
        if (!checkIfUserExists(dbClient, interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setTitle('Error')
                .setDescription('You already have an account registered. Use `/account` to view and manage your account.');
            await interaction.update({ embeds: [embed], components: [] });
            return;
        }

        const info = parseHoyolabInfo(cookies);
        const message = await addUserToDatabase(dbClient, interaction.user.id, info.ltoken_v2, info.ltuid_v2);

        if (message.status === "Fail") {
            const embed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setTitle('Error')
                .setDescription(`${message.message}. Please try again.`);
            await interaction.update({ embeds: [embed], components: [] });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(embedColors.success)
            .setTitle('Success')
            .setDescription(`Use \`/account\` again to view and manage your HoYoLAB account`);
        await interaction.update({ embeds: [embed], components: [] });
    },
}