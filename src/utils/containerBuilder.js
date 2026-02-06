import { ContainerBuilder } from 'discord.js';

/**
 * Create a text container with the given content
 * @param {string} content - The text content
 * @returns {ContainerBuilder}
 */
export const createTextContainer = (content) => {
  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(content)
  );
};
