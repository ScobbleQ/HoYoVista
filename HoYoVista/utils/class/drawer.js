const { loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('node:path');

/**
 * Class to handle drawing on the canvas
 */
class Drawer {
    #canvas;
    #ctx;

    constructor(canvas, ctx) {
        this.#canvas = canvas;
        this.#ctx = ctx;
    }

    /**
     * Centers the text on the X coordinates
     * @param {string} text - Text to be drawn
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    centerText(text, x, y) {
        const textWidth = this.#ctx.measureText(text).width;
        const centeredX = x - textWidth / 2;

        this.#ctx.fillText(text, centeredX, y);
    }

    /**
     * Right aligns the text on the X coordinate
     * @param {string} text - Text to be drawn
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    rightAlignText(text, x, y) {
        const string = text.toString();
        const width = this.#ctx.measureText(string).width;
        const startX = x - width;
    
        this.#ctx.fillText(string, startX, y);
    }

    /**
     * Draws a rounded rectangle
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Width of the rectangle
     * @param {number} height - Height of the rectangle
     * @param {number} radius - Radius of the corners
     * @param {number} fillColor - Fill color of the rectangle
     */
    drawRoundedRect(x, y, width, height, radius, fillColor) {
        this.#ctx.beginPath();
        this.#ctx.moveTo(x + radius, y);
        this.#ctx.arcTo(x + width, y, x + width, y + height, radius);
        this.#ctx.arcTo(x + width, y + height, x, y + height, radius);
        this.#ctx.arcTo(x, y + height, x, y, radius);
        this.#ctx.arcTo(x, y, x + width, y, radius);
        this.#ctx.closePath();

        this.#ctx.fillStyle = fillColor;
        this.#ctx.fill();
    }

    /**
     * Draws an image with rounded corners
     * @param {*} img - Image to be drawn
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Width of the image
     * @param {number} height - Height of the image
     * @param {number} radius - Radius of the corners
     */
    drawImageWithRoundedCorners(img, x, y, width, height, radius) {
        this.#ctx.save();
        this.#ctx.beginPath();
        this.#ctx.moveTo(x + radius, y);
        this.#ctx.arcTo(x + width, y, x + width, y + height, radius);
        this.#ctx.arcTo(x + width, y + height, x, y + height, radius);
        this.#ctx.arcTo(x, y + height, x, y, radius);
        this.#ctx.arcTo(x, y, x + width, y, radius);
        this.#ctx.closePath();
        this.#ctx.clip();
    
        this.#ctx.drawImage(img, x, y, width, height);
        this.#ctx.restore();
    }

    /**
     * Draws a vignette on the canvas
     * @param {number} width - Width of the vignette
     * @param {number} startY - Start Y coordinate
     * @param {number} endY - End Y coordinate
     */
    drawVignette(width, startY, endY) {
        const gradient = this.#ctx.createLinearGradient(0, startY, 0, endY);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
    
        this.#ctx.fillStyle = gradient;
        this.#ctx.fillRect(0, startY, width, endY - startY);
    }

    /**
     * Draw the avatar with background and border
     * @param {*} avatar - Avatar image
     * @param {number} avatarX - X coordinate
     * @param {number} avatarY - Y coordinate
     * @param {number} avatarSize - Size of the avatar
     * @param {boolean} darkMode - Dark mode
     */
    async drawAvatar(avatar, avatarX, avatarY, avatarSize, darkMode) {
        this.#ctx.beginPath();
        this.#ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        this.#ctx.closePath();
        this.#ctx.fillStyle = darkMode ? '#1a1d2a' : '#ffffff';
        this.#ctx.fill();
    
        // Load avatar image and draw
        this.#ctx.save();
        this.#ctx.beginPath();
        this.#ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, (avatarSize / 2) - 5, 0, Math.PI * 2, true);
        this.#ctx.closePath();
        this.#ctx.clip();
        this.#ctx.drawImage(await loadImage(avatar), avatarX + 5, avatarY + 5, avatarSize - 10, avatarSize - 10);
        this.#ctx.restore();
    
        // Draw border around avatar
        this.#ctx.beginPath();
        this.#ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        this.#ctx.closePath();
        this.#ctx.lineWidth = 5;
        this.#ctx.strokeStyle = darkMode ? '#353746' : '#f1f4f9';
        this.#ctx.stroke();
    }

    /**
     * Draws a wrapped text on the canvas
     * @param {string} text - Text to be drawn
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} maxWidth - Maximum width of the text
     * @param {number} lineHeight - Line height
     */
    drawWrappedText(text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let testLine = '';
        let testWidth = 0;
    
        for (let n = 0; n < words.length; n++) {
            testLine += words[n] + ' ';
            testWidth = this.#ctx.measureText(testLine).width;
    
            if (testWidth > maxWidth && n > 0) {
                this.#ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
                testLine = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
    
        this.#ctx.fillText(line, x, y);
    }

    get canvas() {
        return this.#canvas;
    }

    get ctx() {
        return this.#ctx;
    }

    get canvasAndCtx() {
        return { canvas: this.#canvas, ctx: this.#ctx };
    }

    /**
     * Dynamically calculate font size based on character count
     * @param {number} charCount - Number of characters
     * @returns {number} Font size
     */
    static calculateFontSize(charCount) {
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

    static loadFont() {
        try {
            GlobalFonts.registerFromPath(path.join(__dirname, 'assets', 'fonts', 'Helvetica.ttf'), 'Helvetica');
            GlobalFonts.registerFromPath(path.join(__dirname, 'assets', 'fonts', 'Helvetica-Bold.ttf'), 'Helvetica-Bold');
        } catch (error) {
            throw new Error(`Failed to load font: ${error}`);
        }
    }
}

module.exports = { Drawer };