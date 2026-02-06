import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  EmbedBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  SectionBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  WebhookClient,
} from 'discord.js';
import { config } from '../../config.js';

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Send feedback to the developer.')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    const dev = await interaction.client.users.fetch('755897312357777550');

    const devContainer = new ContainerBuilder();

    const introSection = new SectionBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            '## Heyo~',
            "Thank you for using HoYoVista! Your feedback is important to us, whether it's a suggestion, a problem you've encountered, or just a thought you'd like to share.",
            'Click the button below to get started. We appreciate your input!',
          ].join('\n\n')
        )
      )
      .setThumbnailAccessory((thumbnail) => thumbnail.setURL(dev.displayAvatarURL()));
    devContainer.addSectionComponents(introSection);

    const feedbackButton = new ButtonBuilder()
      .setCustomId('feedback')
      .setLabel('Give Feedback')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('<:CustomerSurvey:1278461302573891655>');
    devContainer.addActionRowComponents((row) => row.addComponents(feedbackButton));

    await interaction.reply({
      components: [devContainer],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
  /**
   * @param {import("discord.js").ButtonInteraction} interaction
   * @returns {Promise<void>}
   */
  async handleButtonClick(interaction) {
    const feedbackModal = new ModalBuilder().setCustomId('feedback').setTitle('Send Feedback');

    const typeInput = new TextInputBuilder()
      .setCustomId('feedback_type')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Bug reports, suggestions, feature requests, etc.');

    const typeLabel = new LabelBuilder()
      .setLabel('Feedback Type')
      .setDescription('What type of feedback are you giving?')
      .setTextInputComponent(typeInput);

    const feedbackInput = new TextInputBuilder()
      .setCustomId('feedback_text')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Type your feedback here....');

    const feedbackLabel = new LabelBuilder()
      .setLabel('Content')
      .setDescription('What would you like to share?')
      .setTextInputComponent(feedbackInput);

    feedbackModal.addLabelComponents(typeLabel, feedbackLabel);

    await interaction.showModal(feedbackModal);
  },
  /**
   * @param {import("discord.js").ModalSubmitInteraction} interaction
   * @returns {Promise<void>}
   */
  async handleModalSubmit(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const webhookClient = new WebhookClient({
      id: config.webhookId,
      token: config.webhookToken,
    });

    const feedbackEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${interaction.user.username} [${interaction.user.id}]`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .addFields([
        { name: 'Feedback Type:', value: interaction.fields.getTextInputValue('feedback_type') },
        { name: 'Content:', value: interaction.fields.getTextInputValue('feedback_text') },
      ]);

    await webhookClient.send({
      username: `${interaction.user.displayName || interaction.user.username}`,
      avatarURL: interaction.user.displayAvatarURL(),
      embeds: [feedbackEmbed],
    });

    const successContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        'Your feedback has been successfully submitted. Thank you for your input!'
      )
    );

    await interaction.editReply({
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
