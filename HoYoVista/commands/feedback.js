const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Give feedback to the bot\'s developer'),
    async execute(interaction) {
        try {
            const dev = await interaction.client.users.fetch('399617261230358530');

            const embed = new EmbedBuilder()
                .setColor(config.embedColors.default)
                .setAuthor({ name: dev.username, iconURL: dev.displayAvatarURL() })
                .setDescription('Hello there! 🌟\n\nThank you for using the bot! Your feedback is important to us, whether it\'s a suggestion, a problem you\'ve encountered, or just a thought you\'d like to share.\n\nClick the button below to get started. We appreciate your input and will do our best to respond promptly!');

            const feedbackButton = new ButtonBuilder()
                .setCustomId('feedback_start')
                .setLabel('Give Feedback')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(feedbackButton);

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        } catch (error) {
            throw error;
        }
    },
}