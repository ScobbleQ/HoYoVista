const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, AttachmentBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { HoYoLAB } = require('./class/hoyolab');
const { Drawer } = require('./class/drawer');
const { embedColors } = require('../../config');

// async function listAllStats(canvas, ctx, stats, darkMode) {
//     let y = 380;
//     const keys = Object.keys(stats);
//     const filteredKeys = keys.filter(key => typeof stats[key] === 'number' || typeof stats[key] === 'string');

//     for (let i = 0; i < filteredKeys.length; i += 2) {
//         const key1 = filteredKeys[i];
//         const key2 = filteredKeys[i + 1];

//         // Draw the first box (left)
//         drawRoundedRect(ctx, 70, y + 90, (canvas.width - 180) / 2, 60, 10, darkMode ? '#353746' : '#f1f4f9');
//         ctx.fillStyle = darkMode ? '#b9b9be' : '#5e5e61';
//         ctx.fillText(key1.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()), 80, y + 130);
//         rightAlignText(ctx, stats[key1], (canvas.width - 190) / 2 + 60, y + 130);

//         // Draw the second box (right) if it exists
//         if (key2) {
//             drawRoundedRect(ctx, (canvas.width / 2) + 20, y + 90, (canvas.width - 180) / 2, 60, 10, darkMode ? '#353746' : '#f1f4f9');
//             ctx.fillStyle = darkMode ? '#b9b9be' : '#5e5e61';
//             ctx.fillText(key2.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()), (canvas.width / 2) + 30, y + 130);
//             rightAlignText(ctx, stats[key2], canvas.width - 90, y + 130);
//         }

//         y += 90;
//     }
// }

// async function listSomeCharacters(ctx, characters, darkMode) {
//     let x = 40;

//     for (let i = 0; i < characters.length; i++) {
//         if (i >= 4) { break; }

//         const img = await loadImage(characters[i].card_image);
//         ctx.drawImage(img, x, 1320, img.naturalWidth * 0.9, img.naturalHeight * 0.9);

//         ctx.fillStyle = darkMode ? '#b9b9be' : '#5e5e61';
//         ctx.fillText('Lv.' + characters[i].level, x + 80, 1580);

//         x += 195;
//     }
// }

async function createGenshinProfile(game, dbClient, target, darkMode) {
    // const hoyolabGameProfile = await getGameProfileViaHoyolab(dbClient, target, game);
    // const user = hoyolabGameProfile.data.role;
    // const stats = hoyolabGameProfile.data.stats;
    // const characters = hoyolabGameProfile.data.avatars;

    // const canvas = createCanvas(900, 3000);
    // const ctx = canvas.getContext('2d');

    // // Background
    // const img = await loadImage(await getGameBackground(game));
    // ctx.drawImage(img, 0, 0, 900, 640);
    // drawVignette(ctx, canvas.width, 220, 390);
    // await drawRoundedRect(ctx, 0, 350, canvas.width, canvas.height, 40, await darkMode ? '#0c0f1d' : '#f5f6fb');

    // // Avatar, Name, and Level
    // await drawAvatar(ctx, user.game_head_icon, 40, 190, 130, darkMode); // #a6856e #ece5d8
    // ctx.fillStyle = '#ffffff';
    // ctx.font = '40px Helvetica';
    // ctx.fillText(user.nickname, 210, 240, 580);
    // ctx.font = '35px Helvetica';
    // ctx.fillText(`Level ${user.level}`, 210, 290, 580);

    // // Stat Summary
    // const star = await loadImage('https://act.hoyolab.com/app/community-game-records-sea/images/block_star.52fa49b3.png');
    // ctx.drawImage(star, 50, 390, 30, 30);
    // ctx.font = '40px Helvetica';
    // ctx.fillStyle = await darkMode ? '#dddddf' : '#262626';
    // ctx.fillText('Summary', 100, 415);
    // await drawRoundedRect(ctx, 40, 440, canvas.width - 80, 750, 30, await darkMode ? '#1a1d2a' : '#ffffff');
    // ctx.font = '25px Helvetica';
    // ctx.fillStyle = await darkMode ? '#828389' : '#8f8f8f';
    // listAllStats(canvas, ctx, stats, darkMode);

    // // Character Summary
    // ctx.drawImage(star, 50, 1250, 30, 30);
    // ctx.font = '40px Helvetica';
    // ctx.fillStyle = await darkMode ? '#dddddf' : '#262626';
    // ctx.fillText('My Characters', 100, 1275);
    // await drawRoundedRect(ctx, 40, 1300, canvas.width - 80, 310, 30, await darkMode ? '#1a1d2a' : '#ffffff');
    // ctx.font = '30px Helvetica';
    // ctx.fillStyle = await darkMode ? '#828389' : '#8f8f8f';
    // await listSomeCharacters(ctx, characters, darkMode);

    // // Real-time Note
    // ctx.drawImage(star, 50, 1650, 30, 30);
    // ctx.font = '40px Helvetica';
    // ctx.fillStyle = await darkMode ? '#dddddf' : '#262626';
    // ctx.fillText('Real-Time Notes', 100, 1675);
    // await drawRoundedRect(ctx, 40, 1720, canvas.width - 80, 750, 30, await darkMode ? '#1a1d2a' : '#ffffff');
    // ctx.font = '25px Helvetica';
    // ctx.fillStyle = await darkMode ? '#828389' : '#8f8f8f';

    // const rtn = await getGameRTN(dbClient, target, game);
    // console.log(rtn);


    // const embed = new EmbedBuilder()
    //     .setColor(embedColors.default)
    //     .setImage(`attachment://${user.nickname.replace(' ', '')}.jpeg`)
    //     .setFooter({ text: 'Add game parameter to see game profile' });

    // const deleteButton = new ButtonBuilder()
    //     .setCustomId('delete_button')
    //     .setLabel('Delete Message')
    //     .setStyle(ButtonStyle.Danger);
    // const row = new ActionRowBuilder().addComponents(deleteButton);

    // const profileAttachment = new AttachmentBuilder(await canvas.encode('jpeg'), { name: `${user.nickname.replace(' ', '')}.jpeg` });

    // return { embed, row, profileAttachment };
};

module.exports = { createGenshinProfile };