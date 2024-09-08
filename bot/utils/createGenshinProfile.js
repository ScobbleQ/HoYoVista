const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { HoYoLAB } = require('../class/hoyolab');
const { HoYoGame } = require('../class/hoyogame');
const { Drawer } = require('../class/drawer');
const { embedColors } = require('../../config');

/**
 * Draws all statistics on the canvas.
 */
async function listAllStats(drawer, canvas, ctx, stats, darkMode) {
	let y = 380;
	const keys = Object.keys(stats);
	const filteredKeys = keys.filter(key => typeof stats[key] === 'number' || typeof stats[key] === 'string');

	ctx.font = '25px Helvetica';
	await drawer.drawRoundedRect(40, 440, canvas.width - 80, 750, 30, darkMode ? '#1a1d2a' : '#ffffff');

	for (let i = 0; i < filteredKeys.length; i += 2) {
		const key1 = filteredKeys[i];
		const key2 = filteredKeys[i + 1];

		// Draw left box
		await drawer.drawRoundedRect(70, y + 90, (canvas.width - 180) / 2, 60, 10, darkMode ? '#353746' : '#f1f4f9');
		ctx.fillStyle = darkMode ? '#b9b9be' : '#5e5e61';
		ctx.fillText(formatText(key1), 80, y + 130);
		drawer.rightAlignText(stats[key1], (canvas.width - 190) / 2 + 60, y + 130);

		// Draw right box if it exists
		if (key2) {
			await drawer.drawRoundedRect((canvas.width / 2) + 20, y + 90, (canvas.width - 180) / 2, 60, 10, darkMode ? '#353746' : '#f1f4f9');
			ctx.fillStyle = darkMode ? '#b9b9be' : '#5e5e61';
			ctx.fillText(formatText(key2), (canvas.width / 2) + 30, y + 130);
			drawer.rightAlignText(stats[key2], canvas.width - 90, y + 130);
		}

		y += 90;
	}
}

/**
 * Lists some characters on the canvas.
 */
async function listSomeCharacters(drawer, canvas, ctx, characters, darkMode) {
	let x = 40;

	drawer.drawRoundedRect(40, 1300, canvas.width - 80, 310, 30, darkMode ? '#1a1d2a' : '#ffffff');
	for (let i = 0; i < characters.length && i < 4; i++) {
		const img = await loadImage(characters[i].card_image);
		ctx.drawImage(img, x, 1320, img.naturalWidth * 0.9, img.naturalHeight * 0.9);

		ctx.fillStyle = darkMode ? '#b9b9be' : '#5e5e61';
		ctx.font = '30px Helvetica';
		ctx.fillText(`Lv.${characters[i].level}`, x + 80, 1580);

		x += 195;
	}
}

async function drawRTN(drawer, canvas, ctx, darkMode) {
	drawer.drawRoundedRect(40, 1720, canvas.width - 80, 750, 30, darkMode ? '#1a1d2a' : '#ffffff');
}

/**
 * Creates a Genshin profile canvas and returns the embed and attachment.
 */
async function createGenshinProfile(ltoken_v2, ltuid_v2, user, darkMode) {
	const hoyogame = new HoYoGame(ltoken_v2, ltuid_v2, user.linkedGamesList.genshin, 'genshin');
	const { uid } = user.linkedGamesList.genshin;

	const [gData, gRTN] = await Promise.all([
		hoyogame.getGenshinData(),
		hoyogame.getGenshinRTN(),
	]);

	const role = gData.data.role;

	const canvas = createCanvas(900, 3000);
	const ctx = canvas.getContext('2d');

	const drawer = new Drawer(canvas, ctx);

	const [gameBackground, starImg, avatar] = await Promise.all([
		loadImage(await HoYoLAB.getGameBackground('genshin')),
		loadImage('https://act.hoyolab.com/app/community-game-records-sea/images/block_star.52fa49b3.png'),
		loadImage(role.game_head_icon),
	]);

	// Draw the background
	ctx.drawImage(gameBackground, 0, 0, 900, 640);
	drawer.drawVignette(canvas.width, 220, 390);
	drawer.drawRoundedRect(0, 350, canvas.width, canvas.height, 40, darkMode ? '#0c0f1d' : '#f5f6fb');

	// Draw avatar, name, and level
	drawer.drawAvatar(avatar, 40, 190, 130, darkMode);
	ctx.fillStyle = '#ffffff';
	ctx.font = '40px Helvetica';
	ctx.fillText(role.nickname, 210, 240, 580);
	ctx.font = '35px Helvetica';
	ctx.fillText(`Level ${role.level}`, 210, 290, 580);
	ctx.fillText(uid, 210, 340, 580);

	// Draw stat summary
	ctx.drawImage(starImg, 50, 390, 30, 30);
	ctx.fillStyle = darkMode ? '#dddddf' : '#262626';
	ctx.font = '40px Helvetica';
	ctx.fillText('Summary', 100, 415);
	await listAllStats(drawer, canvas, ctx, gData.data.stats, darkMode);

	// Draw character summary
	ctx.drawImage(starImg, 50, 1250, 30, 30);
	ctx.fillStyle = darkMode ? '#dddddf' : '#262626';
	ctx.font = '40px Helvetica';
	ctx.fillText('My Characters', 100, 1275);
	await listSomeCharacters(drawer, canvas, ctx, gData.data.avatars, darkMode);

	// Real-time Note (RTN)
	ctx.drawImage(starImg, 50, 1650, 30, 30);
	ctx.fillStyle = darkMode ? '#dddddf' : '#262626';
	ctx.font = '40px Helvetica';
	ctx.fillText('Real-Time Notes', 100, 1675);
	await drawRTN(drawer, canvas, ctx, darkMode);

	// Create embed and attachment
	const embed = new EmbedBuilder()
		.setColor(embedColors.default)
		.setDescription('Genshin Impact Profile Development Preview')
		.setImage(`attachment://${hoyogame.uid}.jpeg`);

	const profileAttachment = new AttachmentBuilder(await canvas.encode('jpeg'), { name: `${hoyogame.uid}.jpeg` });

	return { embed, profileAttachment };
}

/**
 * Formats text for display.
 */
function formatText(text) {
	return text.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

module.exports = { createGenshinProfile };