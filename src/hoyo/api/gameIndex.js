import axios from 'axios';
import { BBS_API, Games, IdToAbbr, PUBLIC_API } from '../utils/constants.js';
import { getWebHeader } from '../utils/header.js';

/** @typedef {import("../../utils/typedef.js").GameID} GameID */
/** @typedef {import("../../utils/typedef.js").Cookie} Cookie */

/**
 *
 * @param {GameID} gameId
 * @param {{ gameRoleId: string, region: string, cookies: Cookie }} param0
 * @returns {Promise<{ retcode: number, data: any | null }>}
 */
export async function fetchGameIndex(gameId, { gameRoleId, region, cookies }) {
  const url = getGameIndexUrl(gameId, gameRoleId, region);
  const headers = getWebHeader({ hoyolabCookies: cookies });

  try {
    const response = await axios.get(url, { headers });
    if (response.status !== 200) return { retcode: -1, data: null };
    return { retcode: 1, data: response.data.data };
  } catch {
    return { retcode: -1, data: null };
  }
}

/**
 *
 * @param {GameID} gameId
 * @param {string} gameRoleId
 * @param {string} region
 * @returns {string}
 */
function getGameIndexUrl(gameId, gameRoleId, region) {
  const game = IdToAbbr[gameId];

  if (gameId == Games.ZZZ) {
    return `${PUBLIC_API}/event/game_record_zzz/api/zzz/index?server=${region}&role_id=${gameRoleId}`;
  } else if (gameId == Games.HONKAI) {
    return `${BBS_API}/game_record/honkai3rd/api/index?server=${region}&role_id=${gameRoleId}`;
  } else {
    return `${PUBLIC_API}/event/game_record/${game}/api/index?server=${region}&role_id=${gameRoleId}`;
  }
}
