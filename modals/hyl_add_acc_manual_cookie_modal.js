const { EmbedBuilder } = require('discord.js');
const { checkIfUserExists, addUserToDatabase } = require('../utils//mongo');
const { embedColors } = require('../config');

module.exports = {
    data: {
        id: 'hyl_add_acc_manual_cookie_modal',
        description: 'Add HoYoLAB Account (Manual) with Cookie',
    },
    async execute(interaction, dbClient) {
		const ltuid_v2 = interaction.fields.getTextInputValue('hyl_acc_cookies_ltuid_v2');
		const ltoken_v2 = interaction.fields.getTextInputValue('hyl_acc_cookies_ltoken_v2');

        // Check again if the user exists in the database
        if (!checkIfUserExists(dbClient, interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setTitle('Error')
                .setDescription('You already have an account registered. Use `/account` to view and manage your account.');
            await interaction.update({ embeds: [embed], components: [] });
            return;
        }

        const message = await addUserToDatabase(dbClient, interaction.user.id, ltoken_v2, ltuid_v2);
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