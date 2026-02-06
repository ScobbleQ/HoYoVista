/**
 * @typedef {"1" | "2" | "6" | "8"} GameID
 */

/**
 * @typedef {"Genshin Impact" | "Honkai: Star Rail" | "Honkai Impact 3rd" | "Zenless Zone Zero"} GameName
 */

/**
 * @typedef {{ ltmid_v2: string, ltoken_v2: string, ltuid_v2: string, mi18nLang: string }} HoyolabCookies
 */

/**
 * Row returned from `users` table
 * @typedef {Object} User
 * @property {string} uid
 * @property {string} createdAt
 * @property {boolean} subscribed
 * @property {boolean} private
 * @property {boolean} collectData
 * @property {boolean} notifyCheckin
 * @property {boolean} notifyRedeem
 * @property {string} updatedAt   // timestamp with timezone (string mode)
 */

/**
 * Row returned from `cookies` table
 * @typedef {Object} Cookie
 * @property {string | null} ltmidV2
 * @property {string | null} ltokenV2
 * @property {string | null} ltuidV2
 * @property {string | null} mi18Nlang
 * @property {string | null} accountIdV2
 * @property {string | null} accountMidV2
 */

/**
 * Row returned from `events` table
 * @typedef {Object} Event
 * @property {string} uid
 * @property {string} game
 * @property {string} type
 * @property {string} timestamp   // timestamp with timezone (string mode)
 * @property {unknown | null} metadata
 */

/**
 * Row returned from `games` table
 * @typedef {Object} Game
 * @property {string} uid
 * @property {string} gameId
 * @property {string} gameRoleId
 * @property {string} region
 * @property {string} regionName
 * @property {boolean} autoCheckin
 * @property {boolean} autoRedeem
 * @property {string[]} attemptedCodes
 * @property {string} game
 */

export {};
