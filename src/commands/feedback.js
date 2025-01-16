import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    WebhookClient,
    codeBlock,
    MessageFlags,
} from 'discord.js';
import { config, embedColors } from '../../config.js';
import { successEmbed, primaryEmbed } from '../utils/embedTemplates.js';

export default {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Send feedback to the developer.')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),
    async execute(interaction) {
        const dev = await interaction.client.users.fetch('755897312357777550');

        const embed = primaryEmbed({
            author: { name: dev.username, iconURL: dev.displayAvatarURL() },
            message:
                "Hello there! 🌟\n\nThank you for using the bot! Your feedback is important to us, whether it's a suggestion, a problem you've encountered, or just a thought you'd like to share.\n\nClick the button below to get started. We appreciate your input and will do our best to respond promptly!",
        });

        const feedbackButton = new ButtonBuilder()
            .setCustomId('feedback')
            .setLabel('Give Feedback')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('<:CustomerSurvey:1278461302573891655>');

        const row = new ActionRowBuilder().addComponents(feedbackButton);

        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    },
    async handleButtonClick(interaction) {
        const feedbackModal = new ModalBuilder().setCustomId('feedback').setTitle('Feedback');
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
    },
    async handleModalSubmit(interaction) {
        const webhookClient = new WebhookClient({
            id: config.webhookId,
            token: config.webhookToken,
        });

        const embed = primaryEmbed({
            title: 'Feedback Modal Submission',
            fields: [
                {
                    name: 'Feedback Type',
                    value: interaction.fields.getTextInputValue('feedback_type'),
                },
                {
                    name: 'Content',
                    value: interaction.fields.getTextInputValue('feedback_text'),
                },
            ],
        });

        await webhookClient.send({
            content: '',
            username: interaction.user.username + ' [' + interaction.user.id + ']',
            avatarURL: interaction.user.displayAvatarURL(),
            embeds: [embed],
        });

        await interaction.update({
            embeds: [
                successEmbed({ message: 'Your feedback has been successfully submitted. Thank you for your input!' }),
            ],
            components: [],
        });
    },
};
