import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import { addEvent, addUser, getUser } from '../db/queries.js';

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your account to HoYoVista.')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    // Defer the reply to show the loading state
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // Check if the user is already registered
    const user = await getUser(interaction.user.id);
    if (user) {
      // Add event to the database if enabled
      if (user.collectData) {
        await addEvent(interaction.user.id, {
          game: 'discord',
          type: 'interaction',
          metadata: {
            command: 'register',
          },
        });
      }

      // Show the registered container
      const registeredContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('You have already registered your account.')
      );

      await interaction.editReply({
        components: [registeredContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const registerContainer = new ContainerBuilder();

    // Register text display
    const registerTextDisplay = new TextDisplayBuilder().setContent(
      [
        '## HoYoVista Registration',
        'By registering, you agree to our [Privacy Policy](https://xentriom.gitbook.io/hoyovista/information/privacy-policy) and [Terms of Service](https://xentriom.gitbook.io/hoyovista/information/terms-of-service).',
      ].join('\n')
    );
    registerContainer.addTextDisplayComponents(registerTextDisplay);

    // Register button
    const registerButton = new ButtonBuilder()
      .setCustomId('register-disclaimer')
      .setLabel('Agree and Register')
      .setStyle(ButtonStyle.Success);
    registerContainer.addActionRowComponents((row) => row.addComponents(registerButton));

    // Show the registration container
    await interaction.editReply({
      components: [registerContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
  /**
   *
   * @param {import("discord.js").ButtonInteraction} interaction
   * @returns {Promise<void>}
   */
  async handleButtonClick(interaction) {
    const button = interaction.customId.split('-')[1];

    if (button === 'disclaimer') {
      // Show processing message
      const initialContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('Preparing your account, this will only take a moment...')
      );

      await interaction.update({
        components: [initialContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      // Register the user
      await addUser(interaction.user.id);

      // List of commands to show after registration
      const commands = [
        '- `/hoyolink` - Link/unlink your HoYoLAB account with your Discord account.',
        '- `/settings` - Access and modify your account settings.',
        '- `/data` - Manage your data, including viewing or deleting it.',
      ].join('\n');

      // Show success message with commands list
      const successContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            "## You're all set~",
            'Welcome to HoYoVista! Here are some commands you can use to get started:',
            commands,
          ].join('\n')
        )
      );

      await interaction.editReply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
