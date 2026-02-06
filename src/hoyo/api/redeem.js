import axios from 'axios';
import { GameBizs, Games } from '../utils/constants.js';
import { getAppHeader } from '../utils/header.js';

/** @typedef {import("../../utils/typedef.js").GameID} GameID */
/** @typedef {import("../../utils/typedef.js").Cookie} Cookie */

/**
 * Attempt to redeem a code for the player
 * @param {string} uid - The user's UID
 * @param {{ gameId: GameID, region: string, code: string, cookies: Cookie }} param0
 * @returns {Promise<{ data: any | null, message: string, retcode: number } | null>}
 */
export async function redeemCode(uid, { gameId, region, code, cookies }) {
  const url = getRedeemUrl(gameId);
  const headers = getAppHeader({ hoyolabCookies: cookies });

  // Modify headers for specific games
  if (gameId === Games.GENSHIN) {
    headers['Host'] = 'sg-hk4e-api.hoyolab.com';
  } else if (gameId === Games.STARRAIL) {
    headers['Accept'] = '*/*';
    headers['Host'] = 'public-operation-hkrpg.hoyolab.com';
  } else if (gameId === Games.ZZZ) {
    headers['Accept'] = '*/*';
    headers['Host'] = 'public-operation-nap.hoyolab.com';
  }

  const params = {
    t: Date.now(),
    lang: 'en',
    game_biz: GameBizs[gameId],
    uid: uid,
    region: region,
    cdkey: code,
  };

  try {
    const response = await axios.get(url, { headers, params });
    if (response.status !== 200) return null;
    return response.data;
  } catch {
    return null;
  }
}

/**
 *
 * @param {GameID} gameId
 * @returns {string} The redeem URL for the given game ID
 */
function getRedeemUrl(gameId) {
  switch (gameId) {
    case Games.GENSHIN:
      return 'https://sg-hk4e-api.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl';
    case Games.STARRAIL:
      return 'https://public-operation-hkrpg.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl';
    case Games.ZZZ:
      return 'https://public-operation-nap.hoyoverse.com/common/apicdkey/api/webExchangeCdkeyHyl';
    default:
      return '';
  }
}
