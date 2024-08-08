const { Events } = require('discord.js');
const { Cron } = require('../utils/cron');
const { setPresence } = require('../utils/presence');
const { dailyCheckin } = require('../utils/hoyolab');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client, dbClient) {
		console.log(`\x1b[33mSuccessfully Logged in as ${client.user.tag}\x1b[0m`);
		setPresence(client);

		const cron = new Cron();
		cron.addJob('0 */30 * * * *', setPresence, client);
		cron.addJob('5 12 * * *', dailyCheckin, client, dbClient);

		cron.startJobs();
	},
}