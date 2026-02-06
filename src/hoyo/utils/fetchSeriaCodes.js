import axios from 'axios';
import { createCache, getOrSet } from '../../class/cache.js';

/** @typedef {{ id: number; code: string; rewards: string | null }} ApiResponseCode */
/** @typedef {Record<string, ApiResponseCode[]>} SeriaCodes */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = createCache(CACHE_TTL);

/**
 * @returns {Promise<SeriaCodes>}
 */
export async function fetchSeriaCodes() {
  const cacheKey = 'seria-codes';

  return getOrSet(cache, cacheKey, async () => {
    const fetchedGames = ['hkrpg', 'genshin', 'nap', 'honkai3rd'];
    const headers = { 'User-Agent': 'ScobbleQ' };

    const requests = fetchedGames.map(async (game) => {
      const url = `https://hoyo-codes.seria.moe/codes?game=${game}`;
      const gameName = game === 'nap' ? 'zzz' : game;

      /** @type {import('axios').AxiosResponse<{ codes: ApiResponseCode[] }>} */
      const { data } = await axios.get(url, { headers });

      return {
        [gameName]: data.codes.map((code) => ({
          id: code.id,
          code: code.code,
          rewards: code.rewards || null,
        })),
      };
    });

    const results = await Promise.allSettled(requests);
    return results.reduce((acc, result) => {
      if (result.status === 'fulfilled') {
        Object.assign(acc, result.value);
      }
      return acc;
    }, {});
  });
}
