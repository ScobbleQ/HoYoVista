/** @typedef {import("../../utils/typedef.js").Cookie} Cookie */

/**
 * @param {string} data
 * @returns {Cookie}
 */
export const parseCookies = (data) => {
  /**
   * @param {string} str
   * @param {string} key
   * @returns {string}
   */
  const getValue = (str, key) => {
    const match = str.match(new RegExp(`${key}=([^;]+)`));
    return match ? match[1] : '';
  };

  const ltmid_v2 = getValue(data, 'ltmid_v2');
  const ltoken_v2 = getValue(data, 'ltoken_v2');
  const ltuid_v2 = getValue(data, 'ltuid_v2');
  const mi18nLang = getValue(data, 'mi18nLang');

  return {
    ltmidV2: ltmid_v2,
    ltokenV2: ltoken_v2,
    ltuidV2: ltuid_v2,
    mi18Nlang: mi18nLang,
    accountIdV2: ltuid_v2,
    accountMidV2: ltmid_v2,
  };
};
