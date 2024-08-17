const { Events, Collection, EmbedBuilder } = require('discord.js');
const buttonHandlers = require('../handlers/buttonHandlerLoader');
const modalHandlers = require('../handlers/modalHandlerLoader');
const config = require('../../config');

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
				await handleError(interaction, error);
			}
		} else if (interaction.isButton()) {
			if (interaction.message.interaction.user.id !== interaction.user.id) {
				return interaction.reply({ content: 'You are not allowed to interact with this button.', ephemeral: true });
			}

			const buttonId = interaction.customId;
			const specialHandlerMap = {
				'db_unlink_hyl': 'db_unlink_hyl',
				'db_settings_page': 'db_settings_page',
				'db_auto': 'db_auto',
			};

			const handlerKey = Object.keys(specialHandlerMap).find(prefix => buttonId.startsWith(prefix));
			const handler = handlerKey ? buttonHandlers.get(specialHandlerMap[handlerKey]) : buttonHandlers.get(buttonId);

			try {
				await handler.execute(interaction, dbClient, buttonId);
			} catch (error) {
				handleError(interaction, error);
			}
		} else if (interaction.isStringSelectMenu()) {
			const selection = interaction.values[0];
		} else if (interaction.isModalSubmit()) {
			const modalId = interaction.customId;
			const modal = modalHandlers.get(modalId);

			try {
				await modal.execute(interaction, dbClient);
			} catch (error) {
				handleError(interaction, error);
			}
		}
	},
}

async function handleError(interaction, error) {
	console.error(`\x1b[31m[ERROR]\x1b[0m ${error} trying to execute ${interaction.commandName}`);
	if (interaction.replied || interaction.deferred) {
		await interaction.editReply({
			embeds: [new EmbedBuilder()
				.setColor(config.embedColors.error)
				.setTitle('Uh oh! Something went wrong!')
				.setDescription("" + error)
				.setFooter({ text: 'Please try again later and let me know via /feedback!' })
			],
			components: [],
			files: [],
			ephemeral: true
		});
	} else {
		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setColor(config.embedColors.error)
				.setTitle('Uh oh! Something went wrong!')
				.setDescription("" + error)
				.setFooter({ text: 'Please try again later and let me know via /feedback!' })
			],
			components: [],
			files: [],
			ephemeral: true
		});
	}
}