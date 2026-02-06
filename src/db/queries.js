import { and, desc, eq, inArray } from 'drizzle-orm';
import { config } from '../../config.js';
import { db } from './index.js';
import { cookies, events, games, users } from './schema.js';

/** @typedef {import("../utils/typedef.js").GameID} GameID */
/** @typedef {import("../utils/typedef.js").User} User */
/** @typedef {import("../utils/typedef.js").Cookie} Cookie */
/** @typedef {import("../utils/typedef.js").Game} Game */

/**
 * Get a user from the database
 * @param {string} uid - The Discord ID
 * @returns {Promise<User>}
 */
export async function getUser(uid) {
  const user = await db
    .select({
      uid: users.uid,
      createdAt: users.createdAt,
      subscribed: users.subscribed,
      private: users.private,
      collectData: users.collectData,
      notifyCheckin: users.notifyCheckin,
      notifyRedeem: users.notifyRedeem,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  return user[0];
}

/**
 * Add a user to the database
 * @param {string} uid - The user's Discord ID
 */
export async function addUser(uid) {
  await db.insert(users).values({
    uid,
    createdAt: new Date().toISOString(),
    subscribed: true,
    private: false,
    collectData: true,
    notifyCheckin: true,
    notifyRedeem: true,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a user from the database
 * @param {string} uid - The Discord UID
 */
export async function deleteUser(uid) {
  await db.delete(users).where(eq(users.uid, uid));
}

/**
 * Update a user in the database
 * @param {string} uid - The Discord UID
 * @param {{ field: string, value: any }} param1
 */
export async function updateUser(uid, { field, value }) {
  await db
    .update(users)
    .set({ [field]: value })
    .where(eq(users.uid, uid));
}

/**
 * Add a game to the database
 * @param {string} uid - The Discord UID
 * @param {{ game: string, gameId: string, gameRoleId: string, region: string, regionName: string }} param1
 */
export async function addGame(uid, { game, gameId, gameRoleId, region, regionName }) {
  await db.insert(games).values({
    uid,
    game,
    gameId,
    gameRoleId,
    region,
    regionName,
  });
}

/**
 *
 * @param {string} uid - The Discord UID
 * @param {{ gameId: GameID, field: "autoCheckin" | "autoRedeem", value: boolean }} param1
 */
export async function updateGame(uid, { gameId, field, value }) {
  await db
    .update(games)
    .set({ [field]: value })
    .where(and(eq(games.uid, uid), eq(games.gameId, gameId)));
}

/**
 * Add an event to the database
 * @param {string} uid - The Discord UID
 * @param {{ game: string, type: string, metadata?: Object }} param1
 */
export async function addEvent(uid, { game, type, metadata = {} }) {
  if (config.environment !== 'production') return;
  await db.insert(events).values({
    uid,
    game,
    type,
    metadata: metadata || {},
  });
}

/**
 * Get events for a user
 * @param {string} uid - The Discord UID
 * @param {number} limit - The number of events to return
 * @returns {Promise<{ game: string, type: string, timestamp: string, metadata: unknown }[]>}
 */
export async function getEvents(uid, limit = 0) {
  const baseQuery = db
    .select({
      game: events.game,
      type: events.type,
      timestamp: events.timestamp,
      metadata: events.metadata,
    })
    .from(events)
    .where(eq(events.uid, uid))
    .orderBy(desc(events.timestamp));

  const eventData = limit > 0 ? await baseQuery.limit(limit) : await baseQuery;
  if (eventData.length === 0) {
    return [];
  }

  return eventData;
}

/**
 * Set cookies for a user
 * @param {string} uid - The Discord UID
 * @param {{ hoyolabCookies: Cookie }} param1
 */
export async function setCookies(uid, { hoyolabCookies }) {
  await db.insert(cookies).values({
    uid,
    ltmidV2: hoyolabCookies.ltmidV2,
    ltokenV2: hoyolabCookies.ltokenV2,
    ltuidV2: hoyolabCookies.ltuidV2,
    mi18Nlang: hoyolabCookies.mi18Nlang,
    accountIdV2: hoyolabCookies.accountIdV2,
    accountMidV2: hoyolabCookies.accountMidV2,
  });
}

/**
 * Get cookies for a user
 * @param {string} uid - The Discord UID
 * @returns {Promise<Cookie>}
 */
export async function getCookies(uid) {
  const hoyoCookies = await db
    .select({
      ltmidV2: cookies.ltmidV2,
      ltokenV2: cookies.ltokenV2,
      ltuidV2: cookies.ltuidV2,
      mi18Nlang: cookies.mi18Nlang,
      accountIdV2: cookies.accountIdV2,
      accountMidV2: cookies.accountMidV2,
    })
    .from(cookies)
    .where(eq(cookies.uid, uid))
    .limit(1);

  return hoyoCookies[0];
}

/**
 * Get linked games for a user
 * @param {string} uid - The Discord UID
 * @returns {Promise<{ uid: string, gameId: string, gameRoleId: string, region: string, regionName: string, autoCheckin: boolean, autoRedeem: boolean, attemptedCodes: string[], game: string }[]>}
 */
export async function getUserLinkedGames(uid) {
  const linkedGames = await db
    .select({
      uid: games.uid,
      gameId: games.gameId,
      gameRoleId: games.gameRoleId,
      region: games.region,
      regionName: games.regionName,
      autoCheckin: games.autoCheckin,
      autoRedeem: games.autoRedeem,
      attemptedCodes: games.attemptedCodes,
      game: games.game,
    })
    .from(games)
    .where(eq(games.uid, uid));

  return linkedGames;
}

/**
 * Add an attempted code to a game
 * @param {string} uid - The Discord UID
 * @param {string} gameId - The game ID
 * @param {string} code - The code to add
 */
export async function addAttemptedCode(uid, gameId, code) {
  const userGame = await db
    .select({ attemptedCodes: games.attemptedCodes })
    .from(games)
    .where(and(eq(games.uid, uid), eq(games.gameId, gameId)))
    .limit(1);

  if (userGame.length === 0) return;

  const updatedCodes = userGame[0].attemptedCodes || [];
  if (!updatedCodes.includes(code)) {
    updatedCodes.push(code);
  }

  await db
    .update(games)
    .set({ attemptedCodes: updatedCodes })
    .where(and(eq(games.uid, uid), eq(games.gameId, gameId)));
}

/**
 * Get users with auto check-in enabled
 * @returns {Promise<Omit<User, 'subscribed' | 'createdAt' | 'updatedAt' | 'notifyRedeem'>[]>}
 */
export async function getUsersWithAutoCheckin() {
  // First, find user IDs who have at least one game with autoCheckin=true
  const targetGames = ['genshin', 'honkai3rd', 'hkrpg', 'zzz'];

  const gamesWithAutoCheckin = await db
    .select({ uid: games.uid })
    .from(games)
    .where(and(eq(games.autoCheckin, true), inArray(games.game, targetGames)));

  if (gamesWithAutoCheckin.length === 0) {
    return [];
  }

  // Get only unique user IDs
  /** @type {Record<string, boolean>} */
  const userIdsMap = {};
  for (const g of gamesWithAutoCheckin) {
    userIdsMap[g.uid] = true;
  }

  const userIds = Object.keys(userIdsMap);

  // Get all users data
  const usersData = await db
    .select({
      uid: users.uid,
      private: users.private,
      collectData: users.collectData,
      notifyCheckin: users.notifyCheckin,
    })
    .from(users)
    .where(inArray(users.uid, userIds));

  return usersData;
}

/**
 * Get users with auto redeem enabled
 * @returns {Promise<Omit<User, 'subscribed' | 'createdAt' | 'updatedAt' | 'notifyCheckin'>[]>}
 */
export async function getUsersWithAutoRedeem() {
  const targetGames = ['genshin', 'hkrpg', 'zzz'];

  const gamesWithAutoRedeem = await db
    .select({ uid: games.uid })
    .from(games)
    .where(and(eq(games.autoRedeem, true), inArray(games.game, targetGames)));

  if (gamesWithAutoRedeem.length === 0) {
    return [];
  }

  /** @type {Record<string, boolean>} */
  const userIdsMap = {};
  for (const g of gamesWithAutoRedeem) {
    userIdsMap[g.uid] = true;
  }

  const userIds = Object.keys(userIdsMap);

  const usersData = await db
    .select({
      uid: users.uid,
      private: users.private,
      collectData: users.collectData,
      notifyRedeem: users.notifyRedeem,
    })
    .from(users)
    .where(inArray(users.uid, userIds));

  return usersData;
}

/**
 * Reset a user's settings to default values
 * @param {string} uid - The Discord UID
 */
export async function resetUserSettings(uid) {
  await db
    .update(users)
    .set({
      private: false,
      collectData: true,
      notifyCheckin: true,
      notifyRedeem: true,
    })
    .where(eq(users.uid, uid));

  await db
    .update(games)
    .set({
      autoCheckin: true,
      autoRedeem: true,
    })
    .where(eq(games.uid, uid));
}
