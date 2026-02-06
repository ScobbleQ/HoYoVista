import { createCache, getOrSet } from '../../class/cache.js';
import { getUser, getUserLinkedGames } from '../../db/queries.js';
import { AbbrToFull } from './constants.js';

/** @typedef {import("../../utils/typedef.js").GameID} GameID */
/** @typedef {Array<{ name: string, gameId: string, gameRoleId: string }>} LinkedAccount */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = createCache(CACHE_TTL);

/**
 *
 * @param {string} uid
 * @param {{ exclude?: GameID[] }} [options]
 * @returns {Promise<{ retcode: number, data: LinkedAccount | null }>}
 */
export async function fetchLinkedAccounts(uid, { exclude = [] } = {}) {
  const cacheKey = `linked:${uid}`;

  const result = await getOrSet(cache, cacheKey, async () => {
    const user = await getUser(uid);
    if (!user) {
      return { retcode: -1, data: null };
    }

    const linkedGames = await getUserLinkedGames(uid);
    if (!linkedGames) {
      return { retcode: -1, data: null };
    }

    const simplifiedGames = linkedGames.map((g) => ({
      name: `${AbbrToFull[g.game]} (${g.gameRoleId})`,
      gameId: g.gameId,
      gameRoleId: g.gameRoleId,
    }));

    return { retcode: 1, data: /** @type {LinkedAccount} */ (simplifiedGames) };
  });

  if (result.retcode !== 1 || !result.data) {
    return { retcode: -1, data: null };
  }

  const filteredGames = /** @type {LinkedAccount} */ (result.data).filter(
    (g) => !exclude.includes(/** @type {GameID} */ (g.gameId))
  );

  return { retcode: 1, data: /** @type {LinkedAccount} */ (filteredGames) || null };
}
