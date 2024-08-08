/**
 * Parse the cookie data from HoYoLAB
 * @param {string} data - The data to parse
 * @returns The parsed data (ltoken_v2, ltuid_v2, ltmid_v2)
 */
function parseHoyolabInfo(data) {
    const getValue = (str, key) => {
        const match = str.match(new RegExp(`${key}=([^;]+)`));
        return match ? match[1] : null;
    };
    
    const ltoken_v2 = getValue(data, 'ltoken_v2');
    const ltuid_v2 = getValue(data, 'ltuid_v2');

    return { ltoken_v2, ltuid_v2 };
}

module.exports = { parseHoyolabInfo };