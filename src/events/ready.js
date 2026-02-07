import { Events } from 'discord.js';
import { Cron } from '../class/cron.js';
import { autoCheckin, autoRedeem, saveMonthlyIncome } from '../hoyo/tasks/index.js';
import { setPresence } from '../utils/presence.js';

export default {
  name: Events.ClientReady,
  once: true,
  /**
   * @param {import("discord.js").Client} client
   */
  async execute(client) {
    const cron = new Cron();

    cron.addJob('0 */30 * * * *', setPresence, client); // Every 30 minutes
    //cron.addJob("0 */2 * * *", autoRedeem, client); // Every 2 hours
    //cron.addJob("5 12 * * *", autoCheckin, client); // Daily at 12:05
    //cron.addJob("0 0 14 * *", saveMonthlyIncome); // Monthly on the 14th

    cron.startJobs();
  },
};
