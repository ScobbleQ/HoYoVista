const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, codeBlock } = require('discord.js');
const { MongoDB } = require('../utils/class/mongo');
const { embedColors } = require('../../config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('Configure your user settings'),
	async execute(interaction, dbClient, update) {
		const mongo = new MongoDB(dbClient, interaction.user.id);

		if (update === null || update === undefined) {
			update = false;
		}

		const displayPreference = await mongo.getUserPreference("settings.darkMode") ? 'Dark Mode' : 'Light Mode';
		const privacyPreference = await mongo.getUserPreference("settings.isPrivate") ? 'Private' : 'Public';
		const notifPreference = await mongo.getUserPreference("settings.checkinNotif") ? 'Enabled' : 'Disabled';

		const embed = new EmbedBuilder()
			.setColor(embedColors.default)
			.setTitle(`${interaction.user.id}'s Settings`)
			.setDescription('Click the button below to toggle your settings.')
			.addFields(
				{
					name: 'Display Preference',
					value: `Determines wether your infographics are displayed in Dark or Light Mode.\n${codeBlock(displayPreference)}`,
					inline: false
				},
				{
					name: 'Privacy Preferences',
					value: `Determines the ability for other users to view your information.\n${codeBlock(privacyPreference)}`,
					inline: false
				},
				{
					name: 'Check-in Notifications',
					value: `Determines if you get notified with the reward from Auto Check-in. Failed attempts will send regardless of this setting.\n${codeBlock(notifPreference)}`,
					inline: false
				}
			)
			.setFooter({ text: 'Spamming the buttons may cause unusual changes.' });

		const displayButton = new ButtonBuilder()
			.setCustomId('db_settings_display_btn')
			.setLabel('Display Preferences')
			.setStyle(ButtonStyle.Secondary);

		const privacyButton = new ButtonBuilder()
			.setCustomId('db_settings_privacy_btn')
			.setLabel('Privacy Preferences')
			.setStyle(ButtonStyle.Secondary);

		const notifButton = new ButtonBuilder()
			.setCustomId('db_settings_notif_btn')
			.setLabel('Check-in Notifications')
			.setStyle(ButtonStyle.Secondary);

		const row = new ActionRowBuilder().addComponents(displayButton, privacyButton, notifButton);

		if (update) {
			await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
		} else {
			await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
		}
	},
};