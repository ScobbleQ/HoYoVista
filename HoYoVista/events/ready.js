const { Events } = require('discord.js');
const { Cron } = require('../utils/class/cron');
const { HoYoLAB } = require('../utils/class/hoyolab');
const { Drawer } = require('../utils/class/drawer');
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
		cron.addJob('0 */30 * * * *', setPresence, client);
		cron.addJob('5 12 * * *', HoYoLAB.autoCheckin, client, dbClient);
		cron.startJobs();
	},
}