const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { MongoDB } = require('../utils/class/mongo');
const { createHoyolabProfile } = require('../utils/createHoyolabProfile');
const { createGenshinProfile } = require('../utils/createGenshinProfile');
const { embedColors } = require('../../config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription('View your HoYoLAB profile')
		.addUserOption(option => option
			.setName('user')
			.setDescription('The user to view [Does not work in DMs]')
			.setRequired(false))
		.addStringOption(option => option
			.setName('game')
			.setDescription('The application to view')
			.setRequired(false)
			.addChoices(
				{ name: 'Honkai Impact 3rd', value: 'honkai3rd' },
				{ name: 'Genshin Impact', value: 'genshin' },
				{ name: 'Honkai: Star Rail', value: 'hkrpg' },
				{ name: 'Zenless Zone Zero', value: 'zzz' },
				{ name: 'HoYoLAB', value: 'hyl' })),
	async execute(interaction, dbClient) {
		const target = interaction.options.getMember('user') || interaction.options.getUser('user') || interaction.user;
		const selectedGame = interaction.options.getString('game') || 'hyl';
		const mongo = new MongoDB(dbClient, target.id);

		const [user, isPrivate, darkMode] = await Promise.all([
			mongo.getUserData(),
			target.id !== interaction.user.id ? mongo.getUserPreference('settings.isPrivate') : false,
			MongoDB.getUserPreference(dbClient, interaction.user.id, 'settings.darkMode')
		]);

		if (!user) {
			return await interaction.reply({
				embeds: [new EmbedBuilder()
					.setColor(embedColors.error)
					.setDescription('No HoYoLAB account was found. Please link your HoYoLAB account with `/account`.')
				],
				ephemeral: true
			});
		}

		if (isPrivate) {
			return await interaction.reply({
				embeds: [new EmbedBuilder()
					.setColor(embedColors.error)
					.setDescription('This user has set their profile to private.')
				],
				ephemeral: true
			});
		}

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setColor(embedColors.warning)
				.setImage('attachment://loading.gif')],
			files: [new AttachmentBuilder('https://www.hoyolab.com/_nuxt/img/loading.581e08f.gif',
				{ name: 'loading.gif' }
			)]
		});

		const { ltoken_v2, ltuid_v2 } = user.hoyolab;

		switch (selectedGame) {
			case 'honkai3rd':
				await interaction.editReply({
					embeds: [new EmbedBuilder()
						.setColor(embedColors.error)
						.setDescription('Honkai Impact is giving me weird results. Support will be delayed until further notice.')
					],
					files: []
				});
				break;
			case 'genshin':
				const genshinProfile = await createGenshinProfile(ltoken_v2, ltuid_v2, user.linkedGamesList.genshin, darkMode);				
				await interaction.editReply({ embeds: [genshinProfile.embed], components: [], files: [genshinProfile.profileAttachment] });
				break;
			case 'hkrpg':
				await interaction.editReply({
					embeds: [new EmbedBuilder()
						.setColor(embedColors.error)
						.setDescription('HSR is giving me weird results. Support will be delayed until further notice.')
					],
					files: []
				});
				break;
			case 'zzz':
				// const zenlessProfile = await createZenlessProfile(dbClient, target.id, darkMode);
				// await interaction.editReply({ embeds: [zenlessProfile.embed], components: [zenlessProfile.row], files: [zenlessProfile.profileAttachment] });
				await interaction.editReply({ embeds: [new EmbedBuilder().setColor(embedColors.error).setDescription('Zenless Zone Zero is under development.')], components: [], files: [] });
				break;
			case 'hyl':
			default:
				const hoyolabProfile = await createHoyolabProfile(ltoken_v2, ltuid_v2, darkMode);
				await interaction.editReply({ embeds: [hoyolabProfile.embed], components: [], files: [hoyolabProfile.profileAttachment] });
				break;
		}
	},
};