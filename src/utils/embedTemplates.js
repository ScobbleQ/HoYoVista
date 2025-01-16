import { EmbedBuilder } from 'discord.js';
import { embedColors } from '../../config.js';

export const errorEmbed = ({ title, message }) => {
    const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(message);

    if (title) embed.setTitle(title);
    return embed;
};

export const warningEmbed = ({ message }) => {
    return new EmbedBuilder().setColor(embedColors.warning).setDescription(message);
};

export const successEmbed = ({ title, message }) => {
    const embed = new EmbedBuilder().setColor(embedColors.success).setDescription(message);

    if (title) embed.setTitle(title);
    return embed;
};

export const primaryEmbed = ({ title, message, author, thumbnail, fields, footer }) => {
    const embed = new EmbedBuilder().setColor(embedColors.primary);

    if (title) embed.setTitle(title);
    if (author) embed.setAuthor(author);
    if (message) embed.setDescription(message);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (fields) embed.addFields(fields);
    if (footer) embed.setFooter(footer);

    return embed;
};
