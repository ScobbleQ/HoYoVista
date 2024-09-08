const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, codeBlock, inlineCode } = require('discord.js');
const { MongoDB } = require('../class/mongo');
const { HoYoLAB } = require('../class/hoyolab');
const { embedColors } = require('../../config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('Configure your user settings')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2]),
	async execute(interaction, dbClient, update = false, page = 1) {
		try {
			const mongo = new MongoDB(dbClient, interaction.user.id);
			const user = await mongo.getUserData();

			if (!user) {
				return await interaction.reply({
					embeds: [new EmbedBuilder()
						.setColor(embedColors.error)
						.setDescription('You don\'t have any settings configured yet.'),
					],
					ephemeral: true,
				});
			}

			const embed = new EmbedBuilder().setColor(embedColors.default);
			const row = new ActionRowBuilder();
			let description = '';

			switch (page) {
			case 1:
				embed.setTitle(`${interaction.user.username} [${interaction.user.id}]`);
				embed.setDescription('## Table of Contents ##\nBelow are the available settings you can configure. Select the corresponding button to navigate to the page.')
					.addFields(
						{ name: '1. Preferences', value: 'Determines your preferences for the bot.', inline: false },
						{ name: '2. Auto Check-in', value: 'Configure your auto check-in settings.', inline: false },
						{ name: '3. Auto Code Redemption', value: 'Configure your auto code redemption settings.', inline: false },
					);

				row.addComponents(
					new ButtonBuilder().setCustomId('db_settings_page_skip_2_btn').setLabel('1').setStyle(ButtonStyle.Secondary),
					new ButtonBuilder().setCustomId('db_settings_page_skip_3_btn').setLabel('2').setStyle(ButtonStyle.Secondary),
					new ButtonBuilder().setCustomId('db_settings_page_skip_4_btn').setLabel('3').setStyle(ButtonStyle.Secondary),
				);
				break;
			case 2:
				const displayPreference = user.settings.darkMode ? 'Dark Mode' : 'Light Mode';
				const privacyPreference = user.settings.isPrivate ? 'Private' : 'Public';
				const notifPreference = user.settings.checkinNotif ? 'Enabled' : 'Disabled';

				embed.setTitle('Preferences');
				embed.addFields(
					{
						name: 'Display Preference',
						value: `Determines whether your infographics are displayed in Dark or Light Mode.\n${codeBlock(displayPreference)}`,
						inline: false,
					},
					{
						name: 'Privacy Preferences',
						value: `Determines the ability for other users to view your information.\n${codeBlock(privacyPreference)}`,
						inline: false,
					},
					{
						name: 'Check-in Notifications',
						value: `Determines if you get notified with the reward from Auto Check-in. Failed attempts will send regardless of this setting.\n${codeBlock(notifPreference)}`,
						inline: false,
					},
				);

				row.addComponents(
					new ButtonBuilder().setCustomId('db_settings_display_btn').setLabel('Display').setStyle(ButtonStyle.Secondary),
					new ButtonBuilder().setCustomId('db_settings_privacy_btn').setLabel('Privacy').setStyle(ButtonStyle.Secondary),
					new ButtonBuilder().setCustomId('db_settings_notif_btn').setLabel('Check-in').setStyle(ButtonStyle.Secondary),
				);
				break;
			case 3:
				embed.setTitle('Auto Check-in Settings');
				description = 'Auto checkin-in takes place between <t:1704128700:t> and <t:1704132000:t>.\nThe time is adjusted to your local timezone.\n\n';

				for (const [key, value] of Object.entries(user.linkedGamesList)) {
					if (key !== 'db') {
						const { name, emoji } = await HoYoLAB.getGameUrl(key);
						const autoCheckinStatus = value.auto_checkin ? 'Enabled' : 'Disabled';

						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`db_auto_${key}_${!value.auto_checkin}_btn`)
								.setStyle(ButtonStyle.Secondary)
								.setEmoji(HoYoLAB.getGameUrl(key).emoji),
						);

						description += `${emoji} ${name} - ${inlineCode(autoCheckinStatus)}\n`;
					}
				}

				embed.setDescription(description);
				break;
			case 4:
				embed.setTitle('Auto Code Redemption Settings');
				description = `Only ${inlineCode('Honkai Impact 3rd')} does **not** support auto code redemption.\nYou will get a notification instead if a new code is detected.\n\n`;

				for (const [key, value] of Object.entries(user.linkedGamesList)) {
					if (key !== 'db') {
						const { name, emoji } = await HoYoLAB.getGameUrl(key);
						const autoRedeemStatus = value.auto_redeem ? 'Enabled' : 'Disabled';

						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`db_redeem_${key}_${!value.auto_redeem}_btn`)
								.setStyle(ButtonStyle.Secondary)
								.setEmoji(HoYoLAB.getGameUrl(key).emoji),
						);

						description += `${emoji} ${name} - ${inlineCode(autoRedeemStatus)}\n`;
					}
				}

				embed.setDescription(description);
				break;
			}

			const navRow = new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('db_settings_page_home_1_btn').setStyle(ButtonStyle.Primary).setDisabled(page === 1).setEmoji('<:DoubleLeftArrow:1276991744675807469>'),
				new ButtonBuilder().setCustomId(`db_settings_page_prev_${page}_btn`).setStyle(ButtonStyle.Primary).setDisabled(page === 1).setEmoji('<:LeftArrow:1276992326933151776>'),
				new ButtonBuilder().setCustomId('db_settings_page_indicator_btn').setLabel(`${page}/4`).setStyle(ButtonStyle.Secondary).setDisabled(true),
				new ButtonBuilder().setCustomId(`db_settings_page_next_${page}_btn`).setStyle(ButtonStyle.Primary).setDisabled(page === 4).setEmoji('<:RightArrow:1276992356624629923>'),
				new ButtonBuilder().setCustomId('db_settings_page_end_4_btn').setStyle(ButtonStyle.Primary).setDisabled(page === 4).setEmoji('<:DoubleRightArrow:1276992341403504649>'),
			);

			const response = { embeds: [embed], components: [navRow, row], ephemeral: user.settings.isPrivate };
			update ? await interaction.update(response) : await interaction.reply(response);
		}
		catch (error) {
			throw error;
		}
	},
};