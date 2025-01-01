import { Events } from 'discord.js';
import { MongoDB } from '../class/mongo.js';
import { Cron } from '../class/cron.js';
import { setPresence } from '../utils/presence.js';
import { autoCheckin, autoRedeem } from '../utils/tasks.js';

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		await MongoDB.getInstance().connect();

		const cron = new Cron();

		cron.addJob('0 */30 * * * *', setPresence, client); // Every 30 minutes
		cron.addJob('0 */2 * * *', autoRedeem, client); // Every 2 hours
		cron.addJob('5 12 * * *', autoCheckin, client); // Daily at 12:05

		cron.startJobs();
	},
};