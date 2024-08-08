const { presence } = require('../config.js');

/**
 * Set a random presence for the bot
 * @param {*} client - Discord client
 */
function setPresence(client) {
    const random = Math.floor(Math.random() * presence.length);
    client.user.setPresence(presence[random]);
}

module.exports = { setPresence };