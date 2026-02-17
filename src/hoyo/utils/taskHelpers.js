import { ContainerBuilder, DiscordAPIError, MessageFlags } from 'discord.js';
import { getCookies, getUserLinkedGames, updateUser } from '../../db/queries.js';
import logger from '../../utils/logger.js';

/** @typedef {import("../../utils/typedef.js").Cookie} Cookie */
/** @typedef {import("../../utils/typedef.js").Game} Game */

/**
 * Get cookies and linked games for a user in parallel
 * @param {string} uid - User ID
 * @returns {Promise<[Cookie | null, Game[] | []]>} Tuple of [cookies, linkedGames]
 */
export async function getUserData(uid) {
  const [cookies, linkedGames] = await Promise.all([getCookies(uid), getUserLinkedGames(uid)]);
  return [cookies ?? null, linkedGames ?? []];
}

/**
 * Create a container with header and timestamp
 * @param {string} title - Title for the container header
 * @returns {ContainerBuilder}
 */
export function createTaskContainer(title) {
  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(`${title}\n-# <t:${Math.floor(Date.now() / 1000)}:F>`)
  );
}

/**
 * Send notification to user with error handling for DM disabled errors
 * @param {import("discord.js").Client} client - Discord client
 * @param {string} uid - User ID
 * @param {ContainerBuilder} container - Message container
 * @param {string} taskName - Task name for logging
 * @param {string} notifyField - Field name to disable if DMs are disabled (e.g., 'notifyCheckin', 'notifyRedeem')
 * @returns {Promise<boolean>} True if sent successfully, false otherwise
 */
export async function sendTaskNotification(client, uid, container, taskName, notifyField) {
  try {
    await client.users.send(uid, {
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
    return true;
  } catch (/** @type {any} */ error) {
    if (error instanceof DiscordAPIError && error.code === 50007) {
      // User has DMs disabled, disable notification
      logger.info(`[Cron:${taskName}] Disabling notification for ${uid} (DMs disabled)`);
      await updateUser(uid, { field: notifyField, value: false });
    } else {
      logger.error(`[Cron:${taskName}] Failed to DM user: ${uid}`, {
        stack: error.stack,
      });
    }
    return false;
  }
}

/**
 * Constants for common retcode values
 */
export const RETCODE = {
  INVALID_COOKIES: -100,
  DM_DISABLED: 50007,
};
