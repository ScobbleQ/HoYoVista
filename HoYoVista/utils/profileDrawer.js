const { loadImage } = require('@napi-rs/canvas');

/**
 * Align text to the center
 * @param {*} ctx - Canvas context
 * @param {string} text - Text to center
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function centerText(ctx, text, x, y) {
    const textWidth = ctx.measureText(text).width;
    const centeredX = x - textWidth / 2;
    ctx.fillText(text, centeredX, y);
}

/**
 * Align text to the right
 * @param {*} ctx - Canvas context
 * @param {string} text - Text to right align
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
async function rightAlignText(ctx, text, x, y) {
    const string = text.toString();
    const width = ctx.measureText(string).width;
    const startX = x - width;

    ctx.fillText(string, startX, y);
}

/**
 * Draw a rounded rectangle
 * @param {*} ctx - Canvas context
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Width of the rectangle
 * @param {number} height - Height of the rectangle
 * @param {number} radius - Radius of the rectangle
 * @param {string} fillColor - Fill color of the rectangle
 */
async function drawRoundedRect(ctx, x, y, width, height, radius, fillColor) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
}

/**
 * Draw an image with rounded corners
 * @param {*} ctx - Canvas context
 * @param {*} img - Image to draw
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Width of the image
 * @param {number} height - Height of the image
 * @param {number} radius - Radius of the corners
 */
function drawImageWithRoundedCorners(ctx, img, x, y, width, height, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, x, y, width, height);
    ctx.restore();
}

/**
 * Draw a vignette
 * @param {*} ctx - Canvas context
 * @param {number} width - Width of the vignette
 * @param {number} startY - Start Y coordinate
 * @param {number} endY - End Y coordinate
 */
function drawVignette(ctx, width, startY, endY) {
    const gradient = ctx.createLinearGradient(0, startY, 0, endY);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, startY, width, endY - startY);
}

/**
 * Draw the avatar with background and border
 * @param {*} ctx - Canvas context
 * @param {*} avatarUrl - Avatar to draw
 * @param {number} avatarX - X coordinate
 * @param {number} avatarY - Y coordinate
 * @param {number} avatarSize - Size of the avatar
 * @param {boolean} darkMode - Dark mode
 */
async function drawAvatar(ctx, avatar, avatarX, avatarY, avatarSize, darkMode) {
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = darkMode ? '#1a1d2a' : '#ffffff';
    ctx.fill();

    // Load avatar image and draw
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, (avatarSize / 2) - 5, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(await loadImage(avatar), avatarX + 5, avatarY + 5, avatarSize - 10, avatarSize - 10);
    ctx.restore();

    // Draw border around avatar
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.lineWidth = 5;
    ctx.strokeStyle = darkMode ? '#353746' : '#f1f4f9';
    ctx.stroke();
}

/**
 * Dynamically calculate font size based on character count
 * @param {number} charCount - Number of characters
 * @returns Font size
 */
function calculateFontSize(charCount) {
    const maxFontSize = 35;
    const minFontSize = 25;
    const threshold = 100;
    const maxCharCount = 200;

    if (charCount <= threshold) {
        return maxFontSize;
    } else {
        const excessCount = charCount - threshold;
        const scale = excessCount / (maxCharCount - threshold);
        return maxFontSize - ((maxFontSize - minFontSize) * scale);
    }
}

/**
 * Wrap text and draw it on the canvas
 * @param {*} ctx - Canvas context
 * @param {string} text - Text to wrap
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} maxWidth - Maximum width of the text
 * @param {number} lineHeight - Line height
 */
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let testLine = '';
    let testWidth = 0;

    for (let n = 0; n < words.length; n++) {
        testLine += words[n] + ' ';
        testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
            testLine = words[n] + ' ';
        } else {
            line = testLine;
        }
    }

    ctx.fillText(line, x, y);
    // ctx.fillStyle = 'white';
}

/**
 * Draw the game data on the canvas
 * @param {*} canvas - Canvas
 * @param {*} ctx - Canvas context
 * @param {*} games - Game data
 * @param {boolean} darkMode - Dark mode
 * @param {number} additionalHeightPerGame - Additional height per game
 */
async function renderGames(canvas, ctx, games, darkMode, additionalHeightPerGame) {
    let y = 980;

    for (const game of games) {
        drawRoundedRect(ctx, 50, y - 50, canvas.width - 100, 500, 30, await darkMode ? '#1a1d2a' : '#ffffff');

        drawImageWithRoundedCorners(ctx, await loadImage(game.logo), 80, y - 20, 100, 100, 20);

        ctx.fillStyle = await darkMode ? '#dddddf': '#262626';
        ctx.fillText(game.nickname, 200, y + 15);

        ctx.fillStyle = await darkMode ? '#828389' : '#8f8f8f';
        ctx.fillText(game.region_name + ' Lv.' + game.level, 200, y + 65);

        const backgroundColor = darkMode ? '#353746' : '#f1f4f9';
        const textColor = darkMode ? '#b9b9be' : '#5e5e61';
        game.data.forEach((element, index) => {
            drawRoundedRect(ctx, 80, y + 100 + (index * 85), canvas.width - 160, 70, 10, backgroundColor);

            ctx.fillStyle = textColor;
            ctx.fillText(element.name, 100, y + 145 + (index * 85));
            rightAlignText(ctx, element.value, canvas.width - 100, y + 145 + (index * 85));
        });

        y += additionalHeightPerGame;
    }
}

module.exports = { centerText, drawRoundedRect, drawVignette, drawAvatar, calculateFontSize, drawWrappedText, renderGames };