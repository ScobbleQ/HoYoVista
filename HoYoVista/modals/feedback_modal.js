const { EmbedBuilder, WebhookClient, codeBlock } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: {
        id: 'feedback_modal',
        description: 'Feedback Modal Submission',
    },
    async execute(interaction, dbClient) {
        try {
            const webhookClient = new WebhookClient({ id: config.webhookId, token: config.webhookToken });

            const embed = new EmbedBuilder()
                .setColor(config.embedColors.default)
                .setTitle('Feedback Modal Submission')
                .setDescription(`${codeBlock('yaml', 'Feedback Type')}\n${interaction.fields.getTextInputValue('feedback_type')}\n\n${codeBlock('yaml', 'Content')}\n${interaction.fields.getTextInputValue('feedback_text')}`);

            await webhookClient.send({
                content: '',
                username: interaction.user.username + ' [' + interaction.user.id + ']',
                avatarURL: interaction.user.displayAvatarURL(),
                embeds: [embed],
            });

            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(config.embedColors.success)
                    .setTitle('Feedback Submitted')
                    .setDescription('Your feedback has been successfully submitted. Thank you for your input!')
                ],
                components: []
            });
        } catch (error) {
            throw error;
        }
    },
}