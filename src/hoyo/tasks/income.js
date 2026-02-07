import pLimit from 'p-limit';
import { addLedger, getCookies, getUsersWithCollectData } from '../../db/queries.js';
import { getUserLinkedGames } from '../../db/queries.js';
import logger from '../../utils/logger.js';
import { fetchLedger } from '../api/ledger.js';
import { Games } from '../utils/constants.js';

/** @typedef {import("../../utils/typedef.js").GameID} GameID */

/**
 * Triggers once a month, save last month's income data to the database
 */
export async function saveMonthlyIncome() {
  // Random delay between 0 and 55 minutes
  const delay = Math.floor(Math.random() * 56) * 60 * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const users = await getUsersWithCollectData();
  const limit = pLimit(10);

  // Set to last month
  const now = new Date();
  now.setMonth(now.getMonth() - 1);

  // Get month and year
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  console.log(`[Cron] Saving income for ${month}/${year}`);

  const task = users.map((u) =>
    limit(async () => {
      try {
        const [cookies, linkedGames] = await Promise.all([
          getCookies(u.uid),
          getUserLinkedGames(u.uid),
        ]);

        if (!cookies || !linkedGames) return;

        for (const game of linkedGames) {
          // Skip unsupported games
          if (game.gameId === Games.HONKAI) continue;
          if (game.gameId === Games.STARRAIL) continue;

          // Fetch ledger
          const ledger = await fetchLedger(game.gameRoleId, String(month), {
            gameId: /** @type {GameID} */ (game.gameId),
            region: game.region,
            cookies: cookies,
          });

          // Ledger not found, skip
          if (!ledger) continue;

          // Add ledger to database
          await addLedger(u.uid, {
            gameId: /** @type {GameID} */ (game.gameId),
            gameRoleId: game.gameRoleId,
            month,
            year,
            data: ledger,
          });
        }
      } catch (/** @type {any} */ error) {
        logger.error(`Save Monthly Income: Failed for user ${u.uid}`, { stack: error.stack });
      }
    })
  );

  await Promise.allSettled(task);
}
