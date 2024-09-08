const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { HoYoLAB } = require('../class/hoyolab');
const { Drawer } = require('../class/drawer');
const { embedColors } = require('../../config');

/**
 * Draw the game data on the canvas
 * @param {*} drawer - Drawer object
 * @param {*} games - Game data
 * @param {boolean} darkMode - Dark mode
 * @param {number} additionalHeightPerGame - Additional height per game
 */
async function renderGames(drawer, games, darkMode, additionalHeightPerGame) {
	let y = 980;
	const { canvas, ctx } = drawer.canvasAndCtx;
	const darkModeColors = darkMode ?
		{ bgColor: '#1a1d2a', textColor: '#dddddf', subTextColor: '#828389', cardBgColor: '#353746', cardTextColor: '#b9b9be' } :
		{ bgColor: '#ffffff', textColor: '#262626', subTextColor: '#8f8f8f', cardBgColor: '#f1f4f9', cardTextColor: '#5e5e61' };

	for (const game of games) {
		drawer.drawRoundedRect(50, y - 50, canvas.width - 100, 500, 30, darkModeColors.bgColor);

		await drawer.drawImageWithRoundedCorners(await loadImage(game.logo), 80, y - 20, 100, 100, 20);

		ctx.fillStyle = darkModeColors.textColor;
		ctx.fillText(game.nickname, 200, y + 15);

		ctx.fillStyle = darkModeColors.subTextColor;
		ctx.fillText(game.region_name + ' Lv.' + game.level, 200, y + 65);

		game.data.forEach((element, index) => {
			drawer.drawRoundedRect(80, y + 100 + (index * 85), canvas.width - 160, 70, 10, darkModeColors.cardBgColor);

			ctx.fillStyle = darkModeColors.cardTextColor;
			ctx.fillText(element.name, 100, y + 146 + (index * 85));
			drawer.rightAlignText(element.value, canvas.width - 100, y + 145 + (index * 85));
		});

		y += additionalHeightPerGame;
	}
}

/**
 * Main function to create the HoYoLAB profile
 * @param {string} ltoken_v2 - ltoken_v2 cookie
 * @param {string} ltuid_v2 - ltuid_v2 cookie
 * @param {boolean} darkMode - Dark mode
 * @returns A promise that resolves to an object containing the embed, row, and profile attachment
 */
async function createHoyolabProfile(ltoken_v2, ltuid_v2, darkMode) {
	const hoyolab = new HoYoLAB(ltoken_v2, ltuid_v2);

	const [hoyolabProfile, hoyolabGame] = await Promise.all([
		hoyolab.getFullUserProfile(),
		hoyolab.getGameRecordCard(),
	]);

	const profile = hoyolabProfile.data.user_info;
	const introduction = profile.introduce?.trim() || 'Default signature given to everyone~';
	const games = hoyolabGame.data.list;

	const additionalHeightPerGame = 550;
	const canvasHeight = 950 + (games.length * additionalHeightPerGame);
	const canvas = createCanvas(1125, canvasHeight);
	const ctx = canvas.getContext('2d');

	const drawer = new Drawer(canvas, ctx);

	// Load assets in parallel
	const [bgImage, avatarImage, badgeIcon] = await Promise.all([
		loadImage(profile.bg_url),
		loadImage(profile.avatar_url),
		loadImage(profile.badge.icon_url),
	]);

	// Banner, Avatar, Vignette, and Background
	ctx.drawImage(bgImage, 0, 0, canvas.width, 720);
	drawer.drawVignette(canvas.width, 290, 540);
	drawer.drawRoundedRect(0, 490, canvas.width, canvas.height, 50, darkMode ? '#0c0f1d' : '#f5f6fb');
	await drawer.drawAvatar(avatarImage, 60, 340, 300, darkMode);

	// Nickname and Achievement Badge
	ctx.fillStyle = '#ffffff';
	ctx.font = '70px Helvetica';
	ctx.fillText(profile.nickname || '-', 400, 460);
	const nickWidth = ctx.measureText(profile.nickname).width;
	drawer.drawRoundedRect(400 + nickWidth + 50, 460 - 50, 110, 50, 20, darkMode ? '#242a34' : '#edf1f7');
	ctx.drawImage(badgeIcon, 400 + nickWidth + 30, 460 - 60, 60, 60);
	ctx.font = '35px Helvetica';
	ctx.fillStyle = darkMode ? '#a5a7ac' : '#606265';
	ctx.fillText('+' + profile.badge.total, 400 + nickWidth + 20 + 75, 445);

	// Dynamic Font Size for Introduction
	const calculatedFontSize = Drawer.calculateFontSize(introduction.length);
	ctx.font = `${calculatedFontSize}px Helvetica`;
	ctx.fillStyle = darkMode ? '#a6a6a6' : '#595959';
	drawer.drawWrappedText(introduction, 400, 520 + calculatedFontSize, 680, calculatedFontSize + 5);

	// HoYoLAB Stats
	ctx.fillStyle = darkMode ? '#828389' : '#8c8c8c';
	ctx.font = '35px Helvetica';
	ctx.fillText('Posts', 130, 850);
	ctx.fillText('Following', 360, 850);
	ctx.fillText('Followers', 650, 850);
	ctx.fillText('Likes', 910, 850);

	ctx.fillStyle = darkMode ? '#dddddf' : '#262626';
	ctx.font = '55px Helvetica-Bold';
	drawer.centerText(profile.achieve.post_num.toString(), 175, 780);
	drawer.centerText(profile.achieve.followed_cnt.toString(), 430, 780);
	drawer.centerText(profile.achieve.follow_cnt.toString(), 720, 780);
	drawer.centerText(profile.achieve.like_num.toString(), 955, 780);

	// HoYoLAB Game Profiles
	ctx.font = '35px Helvetica';
	await renderGames(drawer, games, darkMode, additionalHeightPerGame);

	const embed = new EmbedBuilder()
		.setColor(embedColors.default)
		.setImage(`attachment://${profile.uid}.jpeg`);

	const profileAttachment = new AttachmentBuilder(await canvas.encode('jpeg'), { name: `${profile.uid}.jpeg` });

	return { embed, profileAttachment };
}

module.exports = { createHoyolabProfile };