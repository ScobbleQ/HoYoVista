import axios from 'axios';
import { createCache, getOrSet } from '../../class/cache.js';
import { BBS_API, Games, PUBLIC_API } from '../utils/constants.js';
import { generateDS } from '../utils/generateDS.js';
import { getAppHeader, getWebHeader } from '../utils/header.js';

/** @typedef {import("../../utils/typedef.js").GameID} GameID */
/** @typedef {import("../../utils/typedef.js").Cookie} Cookie */

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const cache = createCache(CACHE_TTL);

/**
 *
 * @param {string} uid
 * @param {{ gameId: GameID, region: string, cookies: Cookie }} param0
 * @returns {Promise<any | null>}
 */
export async function fetchNotes(uid, { gameId, region, cookies }) {
  const cacheKey = `notes:${gameId}:${uid}`;

  return getOrSet(cache, cacheKey, async () => {
    const url = getNotesUrl(uid, gameId, region);
    const headers =
      gameId === Games.GENSHIN
        ? getAppHeader({ hoyolabCookies: cookies })
        : getWebHeader({ hoyolabCookies: cookies });

    if (gameId === Games.STARRAIL || gameId === Games.HONKAI) {
      headers['DS'] = generateDS();
      headers['x-rpc-client_type'] = '5';
      headers['Referer'] = 'https://act.hoyolab.com/';
      headers['x-rpc-app_version'] = '1.5.0';
    }

    try {
      const response = await axios.get(url, { headers });
      if (response.status !== 200) return null;
      if (response.data.retcode !== 0) return null;
      return response.data.data;
    } catch {
      return null;
    }
  });
}

/**
 * @param {string} uid
 * @param {GameID} gameId
 * @param {string} region
 * @returns {string}
 */
function getNotesUrl(uid, gameId, region) {
  switch (gameId) {
    case Games.GENSHIN:
      return `${PUBLIC_API}/event/game_record/app/genshin/api/dailyNote?server=${region}&role_id=${uid}`;
    case Games.STARRAIL:
      return `${PUBLIC_API}/event/game_record/hkrpg/api/note?server=${region}&role_id=${uid}`;
    case Games.HONKAI:
      return `${BBS_API}/game_record/honkai3rd/api/note?role_id=${uid}&server=${region}`;
    case Games.ZZZ:
      return `${PUBLIC_API}/event/game_record_zzz/api/zzz/note?server=${region}&role_id=${uid}`;
    default:
      return '';
  }
}
