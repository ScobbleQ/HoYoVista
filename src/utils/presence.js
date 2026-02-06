import { discordPresence } from '../../config.js';

/**
 * Set a random presence for the bot
 * @param {*} client - Discord client
 */
export const setPresence = (client) => {
  const random = Math.floor(Math.random() * discordPresence.length);
  client.user.setPresence(discordPresence[random]);
};
