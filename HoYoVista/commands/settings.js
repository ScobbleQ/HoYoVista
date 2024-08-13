const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, codeBlock } = require('discord.js');
const { MongoDB } = require('../utils/class/mongo');
const { embedColors } = require('../../config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('Configure your user settings'),
	async execute(interaction, dbClient, update = false, page = 1) {
		const mongo = new MongoDB(dbClient, interaction.user.id);

		const embed = new EmbedBuilder()
			.setColor(embedColors.default)
			.setTitle(`${interaction.user.id}'s Settings`)
			.setFooter({ text: 'Spamming the buttons may cause unusual changes.' });

		const row = new ActionRowBuilder();

		switch (page) {
			case 1:
				embed.setDescription('## Table of Contents ##\nBelow are the available settings you can configure, select the corresponding button to navigate to the page.')
					.addFields(
						{ name: '1. Table of Contents', value: `balh blah blah`, inline: false },
						{ name: '2. Preferences', value: `Determines your preferences for the bot.`, inline: false },
						{ name: '3. Temp 3', value: `Temp 3`, inline: false }
					);

				row.addComponents(
					new ButtonBuilder().setCustomId('db_settings__page_skip_1_btn').setLabel('1').setStyle(ButtonStyle.Secondary).setDisabled(true),
					new ButtonBuilder().setCustomId('db_settings_page_skip_2_btn').setLabel('2').setStyle(ButtonStyle.Secondary),
					new ButtonBuilder().setCustomId('db_settings_page_skip_3_btn').setLabel('3').setStyle(ButtonStyle.Secondary)
				);
				break;

			case 2:
				const [displayPreference, privacyPreference, notifPreference] = await Promise.all([
					mongo.getUserPreference("settings.darkMode").then(pref => pref ? 'Dark Mode' : 'Light Mode'),
					mongo.getUserPreference("settings.isPrivate").then(pref => pref ? 'Private' : 'Public'),
					mongo.getUserPreference("settings.checkinNotif").then(pref => pref ? 'Enabled' : 'Disabled'),
				]);

				embed.setDescription('Preferences')
					.addFields(
						{
							name: 'Display Preference',
							value: `Determines whether your infographics are displayed in Dark or Light Mode.\n${codeBlock(displayPreference)}`,
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
					);

				row.addComponents(
					new ButtonBuilder().setCustomId('db_settings_display_btn').setLabel('Display Preferences').setStyle(ButtonStyle.Secondary),
					new ButtonBuilder().setCustomId('db_settings_privacy_btn').setLabel('Privacy Preferences').setStyle(ButtonStyle.Secondary),
					new ButtonBuilder().setCustomId('db_settings_notif_btn').setLabel('Check-in Notifications').setStyle(ButtonStyle.Secondary)
				);
				break;

			case 3:
				embed.setDescription('This is the last page.')
					.addFields({ name: 'Page 3', value: 'This is the last page.', inline: false });

				row.addComponents(
					new ButtonBuilder().setCustomId('db_settings_display_btn').setLabel('Random Temp Button').setStyle(ButtonStyle.Secondary).setDisabled(true)
				);
				break;
		}

		const navRow = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId(`db_settings_page_prev_${page}_btn`).setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(page === 1),
			new ButtonBuilder().setCustomId('db_settings_page_indicator_btn').setLabel(`Page ${page}/3`).setStyle(ButtonStyle.Secondary).setDisabled(true),
			new ButtonBuilder().setCustomId(`db_settings_page_next_${page}_btn`).setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(page === 3)
		);

		const response = { embeds: [embed], components: [navRow, row], ephemeral: true };
		update ? await interaction.update(response) : await interaction.reply(response);
	},
};