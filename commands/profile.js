const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { checkIfUserExists, getUserDisplayPreference, getUserPrivacyPreference } = require('../utils//mongo');
const { getProfileViaHoyolab, getGameViaHoyolab } = require('../utils//hoyolab');
const { centerText, drawRoundedRect, drawVignette, drawAvatar, calculateFontSize, drawWrappedText, renderGames } = require('../utils/profileDrawer');
const { embedColors } = require('../config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription('View your HoYoLAB profile')
		.addUserOption(option => option
			.setName('user')
			.setDescription('The user to view the profile of')
			.setRequired(false))
		.addStringOption(option => option
			.setName('game')
			.setDescription('The game to view the profile of')
			.setRequired(false)
			.addChoices(
				{ name: 'Honkai Impact 3rd', value: 'hi3' },
				{ name: 'Genshin Impact', value: 'gi' },
				{ name: 'Honkai: Star Rail', value: 'hsr' },
				{ name: 'Zenless Zone Zero', value: 'zzz' },
				{ name: 'HoYoLAB', value: 'hyl' })),
	async execute(interaction, dbClient) {
		const target = interaction.options.getMember('user') || interaction.user;
		const selectedGame = interaction.options.getString('game') || 'hyl';

		// Check if user exists in the database
		if (!await checkIfUserExists(dbClient, target.id)) {
			const embed = new EmbedBuilder()
				.setColor(embedColors.error)
				.setDescription('No HoYoLAB account was found. Please link your HoYoLAB account with `/account`');

			await interaction.reply({ embeds: [embed], ephemeral: true });
			return;
		}

		// Check if user has set their profile to private if not the user
		if (target.id !== interaction.user.id) {
			if (await getUserPrivacyPreference(dbClient, target.id)) {
				const embed = new EmbedBuilder()
					.setColor(embedColors.error)
					.setDescription('This user has set their profile to private.');

				await interaction.reply({ embeds: [embed], ephemeral: true });
				return;
			}
		}

		const loadingGif = new AttachmentBuilder('https://www.hoyolab.com/_nuxt/img/loading.581e08f.gif', { name: 'loading.gif' });
		const loadingEmbed = new EmbedBuilder()
			.setColor(embedColors.warning)
			.setImage('attachment://loading.gif');
		await interaction.reply({ embeds: [loadingEmbed], files: [loadingGif] });

		// Use the interaction user's dark mode preference
		const darkMode = await getUserDisplayPreference(dbClient, interaction.user.id);

		if (selectedGame !== 'hyl') {
			const embed = new EmbedBuilder()
				.setColor(embedColors.error)
				.setDescription('This feature is not yet available. Please use `/profile` without a game option.');
			await interaction.editReply({ embeds: [embed], files: [] });
			return;
		}

		// HoYoLAB Profile
		const hoyolabProfile = await getProfileViaHoyolab(dbClient, target.id);
		const profile = hoyolabProfile.data.user_info;
		const introduction = profile.introduce?.trim() || 'Default signature given to everyone~';

		// HoYoLAB Game Profile
		const hoyolabGame = await getGameViaHoyolab(dbClient, target.id);
		const game = hoyolabGame.data.list;

		const baseCanvasHeight = 950;
		const additionalHeightPerGame = 550;
		const canvasHeight = baseCanvasHeight + (game.length * additionalHeightPerGame);

		const canvas = createCanvas(1125, canvasHeight);
		const ctx = canvas.getContext('2d');

		// Banner, Avatar, Vignette, and Background
		ctx.drawImage(await loadImage(profile.bg_url), 0, 0, canvas.width, 720);
		drawVignette(ctx, canvas.width, 290, 540);
		await drawRoundedRect(ctx, 0, 490, canvas.width, canvas.height, 50, await darkMode ? '#0c0f1d' : '#f5f6fb');
		await drawAvatar(ctx, profile.avatar_url, 60, 340, 300, darkMode);

		// Nickname and Achievement Badge
		ctx.fillStyle = '#ffffff';
		ctx.font = '70px Helvetica';
		ctx.fillText(profile.nickname, 400, 460);
		const nickWidth = ctx.measureText(profile.nickname).width;
		await drawRoundedRect(ctx, 400 + nickWidth + 50, 460 - 50, 110, 50, 20, await darkMode ? '#242a34' : '#edf1f7');
		ctx.drawImage(await loadImage(profile.badge.icon_url), 400 + nickWidth + 30, 460 - 60, 60, 60);
		ctx.font = '35px Helvetica';
		ctx.fillStyle = await darkMode ? '#a5a7ac' : '#606265';
		ctx.fillText('+' + profile.badge.total, 400 + nickWidth + 20 + 75, 445);

		// Dynamic Font Size for Introduction
		const calculatedFontSize = calculateFontSize(introduction.length);
		ctx.font = `${calculatedFontSize}px Helvetica`;
		ctx.fillStyle = await darkMode ? '#a6a6a6' : '#595959';
		drawWrappedText(ctx, introduction, 400, 520 + calculatedFontSize, 680, calculatedFontSize + 5);

		// HoYoLAB Stats
		ctx.fillStyle = await darkMode ? '#828389' : '#8c8c8c';
		ctx.font = '35px Helvetica';
		ctx.fillText('Posts', 130, 850);
		ctx.fillText('Following', 360, 850);
		ctx.fillText('Followers', 650, 850);
		ctx.fillText('Likes', 910, 850);

		ctx.fillStyle = await darkMode ? '#dddddf' : '#262626';
		ctx.font = '55px Helvetica';
		centerText(ctx, profile.achieve.post_num.toString(), 175, 780);
		centerText(ctx, profile.achieve.followed_cnt.toString(), 430, 780);
		centerText(ctx, profile.achieve.follow_cnt.toString(), 720, 780);
		centerText(ctx, profile.achieve.like_num.toString(), 955, 780);

		// HoYoLAB Game Profiles
		ctx.font = '35px Helvetica';
		await renderGames(canvas, ctx, game, darkMode, additionalHeightPerGame);

		const embed = new EmbedBuilder()
			.setColor(embedColors.default)
			.setImage(`attachment://${profile.nickname.replace(' ', '')}.jpeg`)
			.setFooter({ text: 'Add game parameter to see game profile' });

		const button = new ButtonBuilder()
			.setCustomId('delete_button')
			.setLabel('Delete Message')
			.setStyle(ButtonStyle.Danger);
		const row = new ActionRowBuilder().addComponents(button);

		const profileAttachment = new AttachmentBuilder(await canvas.encode('jpeg'), { name: `${profile.nickname.replace(' ', '')}.jpeg` });

		await interaction.editReply({ embeds: [embed], components: [row], files: [profileAttachment] });
	},
};