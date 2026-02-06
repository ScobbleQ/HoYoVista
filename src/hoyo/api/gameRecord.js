import axios from 'axios';
import { BBS_API } from '../utils/constants.js';
import { getWebHeader } from '../utils/header.js';

/** @typedef {import("../../utils/typedef.js").Cookie} Cookie */

/**
 *
 * @param {{ cookies: Cookie }} param0
 * @returns {Promise<{ retcode: number, data: any | null }>}
 */
export async function fetchGameRecord({ cookies }) {
  const url = `${BBS_API}/game_record/card/wapi/getGameRecordCard?uid=${cookies.ltuidV2}`;
  const headers = getWebHeader({ hoyolabCookies: cookies });

  try {
    const response = await axios.get(url, { headers });
    if (response.status !== 200) return { retcode: -1, data: null };
    return { retcode: 1, data: response.data.data };
  } catch {
    return { retcode: -1, data: null };
  }
}
