const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: {
        id: 'feedback_start',
        description: 'Starts the feedback process',
    },
    async execute(interaction, dbClient) {
        try {
            const feedbackModal = new ModalBuilder()
                .setCustomId('feedback_modal')
                .setTitle('Feedback');
            const type = new TextInputBuilder()
                .setCustomId('feedback_type')
                .setLabel('Type of Feedback')
                .setPlaceholder('Bug reports, suggestions, etc.')
                .setStyle(TextInputStyle.Short);
            const feedback = new TextInputBuilder()
                .setCustomId('feedback_text')
                .setLabel('Feedback')
                .setPlaceholder('Type your feedback here....')
                .setStyle(TextInputStyle.Paragraph);

            const row1 = new ActionRowBuilder().addComponents(type);
            const row2 = new ActionRowBuilder().addComponents(feedback);
            feedbackModal.addComponents(row1, row2);

            await interaction.showModal(feedbackModal);
        } catch (error) {
            throw error;
        }
    },
};