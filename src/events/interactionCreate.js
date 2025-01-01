import { Events } from 'discord.js';
import logger from '../utils/logger.js';

export default {
	name: Events.InteractionCreate,
	async execute(interaction) {
		const client = interaction.client;

		const getCommandNameFromCustomId = (customId) => {
			return customId.split('-')[0];
		};

		// Handle Slash Commands
		if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
			const command = client.commands.get(interaction.commandName);

			if (!command) {
				logger.warn(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			}
			catch (error) {
				logger.error(`Error executing command ${interaction.commandName}:`, { stack: error.stack });
				await interaction.reply({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				});
			}
		}
		// Handle Autocomplete Commands
		else if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.autocomplete(interaction);
			}
			catch (error) {
				logger.error(`Error executing autocomplete for ${interaction.commandName}:`, { stack: error.stack });
				await interaction.reply({
					content: 'There was an error while executing this autocomplete!',
					ephemeral: true,
				});
			}
		}
		// Handle Modal Submissions
		else if (interaction.isModalSubmit()) {
			const commandName = getCommandNameFromCustomId(interaction.customId);
			const command = client.commands.get(commandName);

			if (!command || typeof command.handleModalSubmit !== 'function') {
				logger.warn(`No modal handler for ${interaction.customId} (command: ${commandName}) was found.`);
				return;
			}

			try {
				await command.handleModalSubmit(interaction);
			}
			catch (error) {
				logger.error(`Error handling modal submission ${interaction.customId}:`, { stack: error.stack });
				await interaction.reply({
					content: 'There was an error handling this modal!',
					ephemeral: true,
				});
			}
		}
		// Handle Button Clicks
		else if (interaction.isButton()) {
			const commandName = getCommandNameFromCustomId(interaction.customId);
			const command = client.commands.get(commandName);

			if (!command || typeof command.handleButtonClick !== 'function') {
				logger.warn(`No button handler for ${interaction.customId} (command: ${commandName}) was found.`);
				return;
			}

			try {
				await command.handleButtonClick(interaction);
			}
			catch (error) {
				logger.error(`Error handling button click ${interaction.customId}:`, { stack: error.stack });
				await interaction.reply({
					content: 'There was an error handling this button interaction!',
					ephemeral: true,
				});
			}
		}
		// Handle Select Menu Interactions
		else if (interaction.isStringSelectMenu()) {
			const commandName = getCommandNameFromCustomId(interaction.customId);
			const command = client.commands.get(commandName);

			if (!command || typeof command.handleSelectMenu !== 'function') {
				logger.warn(`No select menu handler for ${interaction.customId} (command: ${commandName}) was found.`);
				return;
			}

			try {
				await command.handleSelectMenu(interaction);
			}
			catch (error) {
				logger.error(`Error handling select menu interaction ${interaction.customId.split('_')[0]}:`, { stack: error.stack });
				await interaction.reply({
					content: 'There was an error handling this select menu interaction!',
					ephemeral: true,
				});
			}
		}
		else {
			logger.warn(`Unhandled interaction type: ${interaction.type}`);
		}
	},
};