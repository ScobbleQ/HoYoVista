import { DEFAULT_ORIGIN, DEFAULT_REFERER } from './constants.js';

/** @typedef {import("../../utils/typedef.js").Cookie} Cookie */

/**
 * Get the app header for the given Hoyolab cookies
 * @param {{ hoyolabCookies: Cookie }} param0
 * @returns {Record<string, string>} The app header
 */
export function getAppHeader({ hoyolabCookies: { ltmidV2, ltokenV2, ltuidV2, mi18Nlang } }) {
  const header = {
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'HoYoLAB/11 CFNetwork/3860.300.31 Darwin/25.2.0',
    Referer: DEFAULT_REFERER,
    Cookie: `ltmid_v2=${ltmidV2}; ltoken_v2=${ltokenV2}; ltuid_v2=${ltuidV2}; mi18nLang=${mi18Nlang}; account_id_v2=${ltuidV2}; account_mid_v2=${ltmidV2}`,
    Origin: DEFAULT_ORIGIN,
    Connection: 'keep-alive',
    'Accept-Language': 'en-US,en;q=0.9',
    Host: 'sg-public-api.hoyolab.com',
    Accept: 'application/json, text/plain, */*',
    'x-rpc-channel': 'appstore',
  };

  return header;
}

/**
 * Get the web header for the given Hoyolab cookies
 * @param {{ hoyolabCookies: Cookie }} param0
 * @returns {Record<string, string>} The web header
 */
export function getWebHeader({ hoyolabCookies: { ltmidV2, ltokenV2, ltuidV2, mi18Nlang } }) {
  const getCurrentHourMilitary = () => {
    const now = new Date();
    return now.getHours();
  };

  const header = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    Cookie: `ltmid_v2=${ltmidV2}; ltoken_v2=${ltokenV2}; ltuid_v2=${ltuidV2}; mi18nLang=${mi18Nlang}; account_id_v2=${ltuidV2}; account_mid_v2=${ltmidV2}; cookie_token_v2=${ltokenV2}`,
    Origin: DEFAULT_ORIGIN,
    Priority: 'u=3, i',
    Referer: DEFAULT_REFERER,
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
    'x-rpc-hour': `${getCurrentHourMilitary()}`,
    'x-rpc-language': 'en-us',
  };

  return header;
}
