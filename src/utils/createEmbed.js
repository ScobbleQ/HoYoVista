import { EmbedBuilder } from "discord.js";
import { embedColors } from "../../config.js";

export const createEmbed = (description, color = embedColors.error) => {
    return new EmbedBuilder().setColor(color).setDescription(description);
};
