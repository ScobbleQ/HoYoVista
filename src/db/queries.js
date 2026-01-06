import { db } from './index.js';
import { eq } from 'drizzle-orm';
import { users, cookies, events, games } from './schema.js';

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
 *
 * @param {string} uid - The user's Discord ID
 * @param {string} game - The game name [genshin, honkai, etc.]
 * @param {string} type - The event type [checkin, redeem]
 * @param {object} metadata - The event metadata
 */
export async function addEvent(uid, { game, type, metadata = {} }) {
    await db.insert(events).values({
        uid,
        game,
        type,
        metadata: metadata || {},
    });
}

export async function setCookies(uid, { ltmidV2, ltokenV2, ltuidV2, mi18Nlang, accountIdV2, accountMidV2 }) {
    await db.insert(cookies).values({
        uid,
        ltmidV2,
        ltokenV2,
        ltuidV2,
        mi18Nlang,
        accountIdV2,
        accountMidV2,
    });
}

export async function addGame(uid, { game, gameId, gameRoleId, region, regionName }) {
    await db.insert(games).values({
        uid,
        game,
        gameId,
        gameRoleId,
        region,
        regionName,
        autoCheckin: true,
        autoRedeem: true,
        attemptedCodes: [],
    });
}
