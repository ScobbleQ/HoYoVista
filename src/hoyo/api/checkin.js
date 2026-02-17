import axios from 'axios';
import { ACT_IDS, EVENTS, Games } from '../utils/constants.js';
import { getEventUrl } from '../utils/eventUrl.js';
import { getWebHeader } from '../utils/header.js';

/** @typedef {import("../../utils/typedef.js").GameID} GameID */
/** @typedef {import("../../utils/typedef.js").Cookie} Cookie */

/**
 * @typedef {Object} AwardStructure
 * @property {string} icon
 * @property {string} name
 * @property {number} cnt
 */

/**
 * @typedef {{ status: "Failed", retcode: number, message: string } | { status: "SuccessNoDetails"} | { status: "Success", missedDays: number, award: AwardStructure, timestamp: string } } CheckinResponse
 */

/**
 * @param {GameID} gameId
 * @param {{ cookies: Cookie }} param1
 * @returns {Promise<CheckinResponse>}
 */
export async function fetchCheckin(gameId, { cookies }) {
  const url = getCheckinUrl(gameId, cookies.mi18Nlang);
  const headers = getWebHeader({ hoyolabCookies: cookies });

  // Modify headers for specific games
  if (gameId === Games.ZZZ) {
    headers['x-rpc-platform'] = '4';
    headers['x-rpc-signgame'] = 'zzz';
  } else if (gameId === Games.STARRAIL) {
    headers['x-rpc-platform'] = '4';
    headers['x-rpc-signgame'] = 'hkrpg';
  }

  // Set request data for specific games
  let requestData;
  if (gameId === Games.GENSHIN) {
    requestData = { act_id: 'e202102251931481' };
  } else if (gameId === Games.STARRAIL) {
    requestData = { act_id: 'e202303301540311', lang: 'en-us' };
  } else if (gameId === Games.HONKAI) {
    requestData = { act_id: 'e202110291205111' };
  } else if (gameId === Games.ZZZ) {
    requestData = { act_id: 'e202406031448091', lang: 'en-us' };
  }

  try {
    const response = await axios.post(url, requestData, { headers });
    if (response.status !== 200) {
      return { status: 'Failed', retcode: -1, message: response.statusText };
    }

    console.debug('c56', cookies.ltuidV2, response.status, response.data);

    // Not logged in, early return
    if (response.data.retcode === -100) {
      return { status: 'Failed', retcode: -100, message: response.data.message };
    }

    // Check-in failed for other reasons
    if (response.data.retcode !== 0) {
      return { status: 'Failed', retcode: response.data.retcode, message: response.data.message };
    }

    // Get checkin details
    const details = await getCheckinDetails(gameId, cookies.mi18Nlang, cookies);
    // Getting extra details failed BUT check-in was successful
    if (!details) return { status: 'SuccessNoDetails' };

    // Return checkin details
    return {
      status: 'Success',
      missedDays: details.missedDays,
      award: details.award,
      timestamp: details.timestamp,
    };
  } catch (/** @type {any} */ error) {
    return { status: 'Failed', retcode: -1, message: error.message || 'An unknown error occurred' };
  }
}

/**
 * @param {GameID} gameId
 * @param {string} lang
 * @returns {string}
 */
function getCheckinUrl(gameId, lang) {
  let url = `${getEventUrl(gameId)}/event/${EVENTS[gameId]}/sign`;
  if (gameId === Games.GENSHIN || gameId === Games.HONKAI) {
    url += `?lang=${lang}`;
  }

  return url;
}

/**
 * @param {GameID} gameId
 * @param {string} lang
 * @param {Cookie} cookies
 * @returns {Promise<{ missedDays: number, award: AwardStructure, timestamp: string } | null>}
 */
async function getCheckinDetails(gameId, lang, cookies) {
  const headers = getWebHeader({ hoyolabCookies: cookies });
  if (gameId === Games.ZZZ) {
    headers['x-rpc-signgame'] = 'zzz';
  } else if (gameId === Games.STARRAIL) {
    headers['x-rpc-signgame'] = 'hkrpg';
  }

  const infoUrl = getCheckinDetailsUrl(gameId, 'info', lang);
  const homeUrl = getCheckinDetailsUrl(gameId, 'home', lang);

  try {
    const [infoResponse, homeResponse] = await Promise.all([
      axios.get(infoUrl, { headers }),
      axios.get(homeUrl, { headers }),
    ]);

    if (infoResponse.status !== 200 || homeResponse.status !== 200) return null;
    if (infoResponse.data.retcode !== 0 || homeResponse.data.retcode !== 0) return null;

    const [infoData, homeData] = [infoResponse.data.data, homeResponse.data.data];

    const today = Number(infoData.today.split('-')[2]);
    const missedDays = today - infoData.total_sign_day;
    const award = homeData.awards[today - 1];

    return {
      missedDays,
      award,
      timestamp: homeData.now,
    };
  } catch {
    return null;
  }
}

/**
 * @param {GameID} gameId
 * @param {"info" | "home"} type
 * @param {string} lang
 * @returns {string}
 */
function getCheckinDetailsUrl(gameId, type, lang) {
  return `${getEventUrl(gameId)}/event/${EVENTS[gameId]}/${type}?lang=${lang}&act_id=${ACT_IDS[gameId]}`;
}
