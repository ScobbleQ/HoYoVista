/** @typedef {import("../../utils/typedef.js").GameID} GameID */

/**
 * @type {Readonly<{
 *   readonly GENSHIN: "2";
 *   readonly STARRAIL: "6";
 *   readonly HONKAI: "1";
 *   readonly ZZZ: "8";
 * }>}
 */
export const Games = Object.freeze({
  GENSHIN: '2',
  STARRAIL: '6',
  HONKAI: '1',
  ZZZ: '8',
});

const games = [
  { id: Games.GENSHIN, full: 'Genshin Impact', abbr: 'genshin', short: 'Genshin' },
  { id: Games.STARRAIL, full: 'Honkai: Star Rail', abbr: 'hkrpg', short: 'StarRail' },
  { id: Games.HONKAI, full: 'Honkai Impact 3rd', abbr: 'honkai3rd', short: 'Honkai3rd' },
  { id: Games.ZZZ, full: 'Zenless Zone Zero', abbr: 'zzz', short: 'Zenless' },
];

/** @type {Readonly<Record<GameID, string>>} */
export const GameBizs = Object.freeze({
  [Games.GENSHIN]: 'hk4e_global',
  [Games.STARRAIL]: 'hkrpg_global',
  [Games.HONKAI]: 'bh3_os',
  [Games.ZZZ]: 'nap_global',
});

/** @type {Readonly<Record<GameID, string>>} */
export const EVENTS = Object.freeze({
  [Games.GENSHIN]: 'sol',
  [Games.STARRAIL]: 'luna/hkrpg/os',
  [Games.HONKAI]: 'mani',
  [Games.ZZZ]: 'luna/zzz/os',
});

/** @type {Readonly<Record<GameID, string>>} */
export const ACT_IDS = Object.freeze({
  [Games.GENSHIN]: 'e202102251931481',
  [Games.STARRAIL]: 'e202303301540311',
  [Games.HONKAI]: 'e202110291205111',
  [Games.ZZZ]: 'e202406031448091',
});

export const BBS_API = 'https://bbs-api-os.hoyolab.com';
export const ACCOUNT_API = 'https://api-account-os.hoyolab.com';
export const HK4E_API = 'https://sg-hk4e-api.hoyolab.com';
export const PUBLIC_API = 'https://sg-public-api.hoyolab.com';
export const DEFAULT_ORIGIN = 'https://act.hoyolab.com';
export const DEFAULT_REFERER = 'https://hoyolab.com/';
export const SG_ACT = 'https://sg-act-nap-api.hoyolab.com';

export const FullToAbbr = Object.freeze(
  Object.fromEntries(games.map((game) => [game.full, game.abbr]))
);

export const FullToId = Object.freeze(
  Object.fromEntries(games.map((game) => [game.full, game.id]))
);

export const IdToFull = Object.freeze(
  Object.fromEntries(games.map((game) => [game.id, game.full]))
);

export const IdToAbbr = Object.freeze(
  Object.fromEntries(games.map((game) => [game.id, game.abbr]))
);

export const IdToShort = Object.freeze(
  Object.fromEntries(games.map((game) => [game.id, game.short]))
);

export const AbbrToFull = Object.freeze(
  Object.fromEntries(games.map((game) => [game.abbr, game.full]))
);

export const AbbrToId = Object.freeze(
  Object.fromEntries(games.map((game) => [game.abbr, game.id]))
);

export const superstringDimensionTier = Object.freeze({
  1: 'Forbidden',
  2: 'Sinful I',
  3: 'Sinful II',
  4: 'Sinful III',
  5: 'Agony I',
  6: 'Agony II',
  7: 'Agony III',
  8: 'Redlotus',
  9: 'Nirvana',
});

export const zenlessRevenueStream = Object.freeze({
  mail_rewards: 'Mail Rewards',
  shiyu_rewards: 'Shiyu Defense & Deadly Assult Rewards',
  daily_activity_rewards: 'Daily Activity Rewards',
  growth_rewards: 'Development Rewards',
  event_rewards: 'Event Rewards',
  hollow_rewards: 'Hallow Zero Rewards',
  other_rewards: 'Other Rewards',
});
