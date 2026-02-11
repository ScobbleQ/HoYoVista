import { Events, MessageFlags } from 'discord.js';
import logger from '../utils/logger.js';

/**
 * Discord command module shape (used by client.commands)
 * @typedef {Object} Command
 * @property {import("discord.js").SlashCommandBuilder | import("discord.js").ContextMenuCommandBuilder} data
 * @property {(interaction: import("discord.js").ChatInputCommandInteraction | import("discord.js").ContextMenuCommandInteraction) => Promise<void>} execute
 * @property {(interaction: import("discord.js").AutocompleteInteraction) => Promise<void>} [autocomplete]
 * @property {(interaction: import("discord.js").ModalSubmitInteraction) => Promise<void>} [handleModalSubmit]
 * @property {(interaction: import("discord.js").ButtonInteraction) => Promise<void>} [handleButtonClick]
 * @property {(interaction: import("discord.js").StringSelectMenuInteraction) => Promise<void>} [handleSelectMenu]
 * @property {number} [cooldown]
 */

/**
 * @typedef {import("discord.js").Client & { commands: import("discord.js").Collection<string, Command> }} ClientWithCommands
 */

export default {
  name: Events.InteractionCreate,
  /**
   * @param {import("discord.js").Interaction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    const client = /** @type {ClientWithCommands} */ (interaction.client);

    /** @param {string} customId */
    const getCommandNameFromCustomId = (customId) => customId.split('-')[0];

    // Handle Slash and Context Menu Commands
    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (/** @type {any} */ error) {
        logger.error(`Error executing command ${interaction.commandName}:`, {
          stack: error.stack,
        });
        await interaction.reply({
          content: 'There was an error while executing this command!',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    // Handle Autocomplete Commands
    else if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);

      if (!command || typeof command.autocomplete !== 'function') {
        logger.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (/** @type {any} */ error) {
        logger.error(`Error executing autocomplete for ${interaction.commandName}:`, {
          stack: error.stack,
        });
        await interaction.respond([
          {
            name: 'There was an error while executing this autocomplete!',
            value: '-1',
          },
        ]);
      }
    }
    // Handle Modal Submissions
    else if (interaction.isModalSubmit()) {
      const commandName = getCommandNameFromCustomId(interaction.customId);
      const command = client.commands.get(commandName);

      if (!command || typeof command.handleModalSubmit !== 'function') {
        logger.warn(
          `No modal handler for ${interaction.customId} (command: ${commandName}) was found.`
        );
        return;
      }

      try {
        await command.handleModalSubmit(interaction);
      } catch (/** @type {any} */ error) {
        logger.error(`Error handling modal submission ${interaction.customId}:`, {
          stack: error.stack,
        });
        await interaction.reply({
          content: 'There was an error handling this modal!',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    // Handle Button Clicks
    else if (interaction.isButton()) {
      const commandName = getCommandNameFromCustomId(interaction.customId);
      const command = client.commands.get(commandName);

      if (!command || typeof command.handleButtonClick !== 'function') {
        logger.warn(
          `No button handler for ${interaction.customId} (command: ${commandName}) was found.`
        );
        return;
      }

      try {
        await command.handleButtonClick(interaction);
      } catch (/** @type {any} */ error) {
        logger.error(`Error handling button click ${interaction.customId}:`, {
          stack: error.stack,
        });
        await interaction.reply({
          content: 'There was an error handling this button interaction!',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    // Handle Select Menu Interactions
    else if (interaction.isStringSelectMenu()) {
      const commandName = getCommandNameFromCustomId(interaction.customId);
      const command = client.commands.get(commandName);

      if (!command || typeof command.handleSelectMenu !== 'function') {
        logger.warn(
          `No select menu handler for ${interaction.customId} (command: ${commandName}) was found.`
        );
        return;
      }

      try {
        await command.handleSelectMenu(interaction);
      } catch (/** @type {any} */ error) {
        logger.error(
          `Error handling select menu interaction ${interaction.customId.split('_')[0]}:`,
          {
            stack: error.stack,
          }
        );
        await interaction.reply({
          content: 'There was an error handling this select menu interaction!',
          flags: MessageFlags.Ephemeral,
        });
      }
    } else {
      logger.warn(`Unhandled interaction type: ${interaction.type}`);
    }
  },
};
