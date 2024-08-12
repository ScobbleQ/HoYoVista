const { CronJob } = require('cron');

/**
 * Cron class to handle cron jobs
 */
class Cron {
    #jobs = [];

    constructor() {
        this.#jobs = [];
    }

    /**
     * Add a new job to the cron
     * @param {string} time - Cron time format
     * @param {*} callback - Function to be called
     * @param  {...any} args - Arguments for the function
     */
    addJob(time, callback, ...args) {
        const jobCallback = () => callback(...args);
        const job = new CronJob(time, jobCallback, null, false, 'America/New_York');
        this.#jobs.push(job);
    }

    /**
     * Start all cron jobs
     */
    startJobs() {
        console.log(`\x1b[36m[Cron]\x1b[0m Starting ${this.#jobs.length} jobs`);
        this.#jobs.forEach(job => job.start());
    }

    /**
     * Stop all cron jobs
     */
    stopJobs() {
        console.log(`\x1b[36m[Cron]\x1b[0m Stopping ${this.#jobs.length} jobs`);
        this.#jobs.forEach(job => job.stop());
    }
}

module.exports = { Cron };