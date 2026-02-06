import { CronJob } from 'cron';
import logger from '../utils/logger.js';

export class Cron {
  /** @type {CronJob[]} */
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
    logger.info(`Cron: Starting ${this.#jobs.length} jobs`);
    this.#jobs.forEach((job) => job.start());
  }

  /**
   * Stop all cron jobs
   */
  stopJobs() {
    logger.info(`Cron: Stopping ${this.#jobs.length} jobs`);
    this.#jobs.forEach((job) => job.stop());
  }
}
