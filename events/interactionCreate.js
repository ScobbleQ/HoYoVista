const { Events, Collection } = require('discord.js');
const buttonHandlers = require('../handlers/buttonHandlerLoader');
const modalHandlers = require('../handlers/modalHandlerLoader');
const { removeAccount } = require('../utils//hoyolab');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction, dbClient) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			const { cooldowns } = interaction.client;

			if (!cooldowns.has(command.data.name)) {
				cooldowns.set(command.data.name, new Collection());
			}

			const now = Date.now();
			const timestamps = cooldowns.get(command.data.name);
			const defaultCooldownDuration = 3;
			const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

			if (timestamps.has(interaction.user.id)) {
				const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

				if (now < expirationTime) {
					const expiredTimestamp = Math.round(expirationTime / 1000);
					return interaction.reply({ 
						content: `Please wait, you are on a cooldown for \`/${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, 
						ephemeral: true 
					});
				}
			}

			timestamps.set(interaction.user.id, now);
			setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

			try {
				await command.execute(interaction, dbClient);
			} catch (error) {
				console.log(error);
				console.error(`\x1b[31m[ERROR]\x1b[0m ${error} trying to execute ${interaction.commandName}`);
			}
		} else if (interaction.isButton()) {
			if (interaction.message.interaction.user.id !== interaction.user.id) {
                return interaction.reply({ content: 'You are not allowed to interact with this button.', ephemeral: true });
            }

            const buttonId = interaction.customId;
			
			if (buttonId.startsWith('db_unlink_hyl_')) {
				const idParts = buttonId.replace('db_unlink_hyl_', '').split('_');

				if (idParts.length === 1) {
					const discordId = idParts[0];
					await removeAccount(interaction, dbClient, discordId, 'all');
				} else if (idParts.length === 2) {
					const [discordId, gameName] = idParts;
					await removeAccount(interaction, dbClient, discordId, gameName);
				}
			} else {
				const handler = buttonHandlers.get(buttonId);

				if (handler) {
					try {
						await handler.execute(interaction, dbClient);
					} catch (error) {
						console.error(`\x1b[31m[ERROR]\x1b[0m ${error} trying to execute handler for ${buttonId}`);
					}
				} else {
					console.error(`\x1b[31m[ERROR]\x1b[0m No handler found for buttonId: ${buttonId}`);
				}
			}
		} else if (interaction.isStringSelectMenu()) {
			const selection = interaction.values[0];
		} else if (interaction.isModalSubmit()) {
			const modalId = interaction.customId;
			const modal = modalHandlers.get(modalId);

			if (modal) {
				try {
					await modal.execute(interaction, dbClient);
				} catch (error) {
					console.error(`\x1b[31m[ERROR]\x1b[0m ${error} trying to execute handler for ${modalId}`);
				}
			} else {
				console.error(`\x1b[31m[ERROR]\x1b[0m No handler found for modalId: ${modalId}`);
			}
		}
	},
}