import { createCache, getOrSet } from '../../class/cache.js';
import { Games, HK4E_API, PUBLIC_API } from '../utils/constants.js';
import { getAppHeader } from '../utils/header.js';

/** @typedef {import("../../utils/typedef.js").GameID} GameID */
/** @typedef {import("../../utils/typedef.js").Cookie} Cookie */

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const cache = createCache(CACHE_TTL);

/**
 *
 * @param {string} uid
 * @param {string} month
 * @param {{ gameId: GameID, region: string, cookies: Cookie }} param0
 * @returns {Promise<any | null>}
 */
export async function fetchLedger(uid, month, { gameId, region, cookies }) {
  // Adjust month for STARRAIL and ZZZ
  let adjustedMonth = month;
  if (gameId === Games.STARRAIL || gameId === Games.ZZZ) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const year = now.getFullYear() - (parseInt(month, 10) > currentMonth ? 1 : 0);
    adjustedMonth = `${year}${month.padStart(2, '0')}`;
  }

  const cacheKey = `ledger:${gameId}:${uid}:${adjustedMonth}`;
  return getOrSet(cache, cacheKey, async () => {
    const url = getLedgerUrl(uid, gameId, region, cookies.mi18Nlang ?? '', adjustedMonth);
    const headers = getAppHeader({ hoyolabCookies: cookies });

    // Modify headers for specific games
    headers['Referer'] = 'https://act.hoyolab.com/';
    delete headers['x-rpc-channel'];
    if (gameId === Games.GENSHIN) {
      headers['Host'] = HK4E_API;
    } else if (gameId === Games.ZZZ) {
      headers['Host'] = PUBLIC_API;
    } else if (gameId === Games.STARRAIL) {
      headers['Host'] = PUBLIC_API;
      headers['Accept'] = '*/*';
    }

    try {
      const response = await fetch(url, { headers });
      const data = await response.json();
      if (data.retcode !== 0) return null;
      return data.data;
    } catch {
      return null;
    }
  });
}

/**
 * @param {string} uid
 * @param {GameID} gameId
 * @param {string} region
 * @param {string} lang
 * @param {string} month
 * @returns {string}
 */
function getLedgerUrl(uid, gameId, region, lang, month) {
  switch (gameId) {
    case Games.GENSHIN:
      return `https://sg-hk4e-api.hoyolab.com/event/ysledgeros/month_info?month=${month}&region=${region}&uid=${uid}`;
    case Games.STARRAIL:
      return `https://sg-public-api.hoyolab.com/event/srledger/month_info?lang=${lang}&uid=${uid}&region=${region}&month=${month}`;
    case Games.ZZZ:
      return `https://sg-public-api.hoyolab.com/event/nap_ledger/month_info?uid=${uid}&region=${region}&month=${month}`;
    default:
      return '';
  }
}
