const { Events } = require('discord.js');
const { Cron } = require('../class/cron');
const { HoYoLAB } = require('../class/hoyolab');
const { Drawer } = require('../class/drawer');
const { setPresence } = require('../utils/presence');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client, dbClient) {
		console.log(`\x1b[33mSuccessfully Logged in as ${client.user.tag}\x1b[0m`);

		// Load the font for the drawer and set the presence
		Drawer.loadFont();
		setPresence(client);

		// Set up the cron jobs
		const cron = new Cron();
		cron.addJob('0 */30 * * * *', setPresence, client); // Every 30 minutes
		cron.addJob('0 */2 * * *', HoYoLAB.scheduleRedeemCodes, client, dbClient); // Every 2 hours
		cron.addJob('0 */23 * * *', HoYoLAB.updateCookieToken, dbClient); // Every 23 hours
		cron.addJob('5 12 * * *', HoYoLAB.scheduleCheckin, client, dbClient); // 12:05 PM
		cron.startJobs();
	},
};