import { ContainerBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('roadmap')
    .setDescription('View upcoming features and improvements')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    const container = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '## Moonlit Reverie (v4.0.0)',
          '',
          '### Command Improvements',
          '- [/notes] Restore support to Zenless, Star Rail, and Honkai',
          '- [/redeem] Add support for manual code redemption',
          '',
          '### New Commands/Features',
          '- Monthly Income Report',
          '- [/builds] Character Builds (integrates with Enka.Network)',
          '- [/events] View upcoming events',
          '- [/banners] View the banners',
          '',
          '— Last updated on Feb 06, 2026. Subject to change.',
        ].join('\n')
      )
    );

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
};
