import { MongoDB } from '../class/mongo.js';
import { performCheckin } from '../hoyolab/checkin.js';
import { redeemCode, cleanAttemptedCodes } from '../hoyolab/redeem.js';
import logger from './logger.js';
import { fetchSeriaCodes } from './fetchSeriaCodes.js';
import pLimit from 'p-limit';

export const autoCheckin = async (client) => {
    // Random delay between 0 and 55 minutes
    const delay = Math.floor(Math.random() * 56) * 60 * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const query = {
        $or: [
            { 'linked_games.genshin.auto_checkin': true },
            { 'linked_games.honkai3rd.auto_checkin': true },
            { 'linked_games.hkrpg.auto_checkin': true },
            { 'linked_games.zzz.auto_checkin': true },
        ],
    };

    const mongo = MongoDB.getInstance();
    const { data: users } = await mongo.find(query);

    const limit = pLimit(10);

    const task = users.map((u) =>
        limit(async () => {
            try {
                const checkin = await performCheckin({
                    discordId: u.discord_id,
                    arrayOfGameId: Object.values(u.linked_games).map((game) => game.game_id),
                    linkedGames: u.linked_games,
                    hoyolabCookies: u.hoyolab_cookies,
                    isPrivate: u.settings.is_private,
                    to_notify_checkin: u.settings.to_notify_checkin,
                    automatic: true,
                });

                // Collect data if enabled
                if (u.settings.collect_data) {
                    await mongo.increment(u.discord_id, {
                        field: 'stats.total_checkin',
                        value: checkin.amount,
                    });
                }

                // Send notification if enabled
                if (u.settings.to_notify_checkin) {
                    try {
                        await client.users.send(u.discord_id, { embeds: checkin.embeds });
                    } catch (err) {
                        if (err.code === 50007) {
                            // no DM permission, disable notifications if enabled
                            await mongo.set(u.discord_id, {
                                field: 'settings.to_notify_checkin',
                                value: false,
                            });
                        } else {
                            // log error
                            logger.warn(`Auto Checkin: Failed to DM user ${u.discord_id}`, {
                                stack: err.stack,
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error(`Auto Checkin: Failed for user ${u.discord_id}`, {
                    stack: error.stack,
                });
            } finally {
                // clean up attempted code from db
                cleanAttemptedCodes(u.discord_id);
            }
        })
    );

    await Promise.allSettled(task);
};

export const autoRedeem = async (client) => {
    let availableCodes;

    try {
        availableCodes = await fetchSeriaCodes();
    } catch {
        logger.error('Unable to fetch seria codes', { stack: error.stack });
        return;
    }

    if (!availableCodes) return;

    const query = {
        $or: [
            { 'linked_games.genshin.auto_redeem': true },
            { 'linked_games.honkai3rd.auto_redeem': true },
            { 'linked_games.hkrpg.auto_redeem': true },
            { 'linked_games.zzz.auto_redeem': true },
        ],
    };

    const mongo = MongoDB.getInstance();
    const { data: users } = await mongo.find(query);

    const limit = pLimit(10);

    const task = users.map((u) =>
        limit(async () => {
            try {
                const redeem = await redeemCode(u.discord_id, availableCodes, {
                    arrayOfGameId: Object.values(u.linked_games).map((game) => game.game_id),
                    hoyolabCookies: u.hoyolab_cookies,
                    linkedGames: u.linked_games,
                    isPrivate: u.settings.is_private,
                    toNotify: u.settings.to_notify_redeem,
                    automatic: true,
                });

                if (u.settings.collect_data) {
                    await mongo.increment(u.discord_id, { field: 'stats.total_redeem', value: redeem.amount });
                }

                if (u.settings.to_notify_redeem && redeem.embeds.length > 0) {
                    try {
                        await client.users.send(u.discord_id, { embeds: redeem.embeds });
                    } catch (err) {
                        if (err.code === 50007) {
                            await mongo.set(u.discord_id, {
                                field: 'settings.to_notify_redeem',
                                value: false,
                            });
                        } else {
                            logger.warn(`Auto Redeem: Failed to DM user ${u.discord_id}`, {
                                stack: err.stack,
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error(`Auto Redeem: Failed for user ${u.discord_id}`, { stack: error.stack });
            }
        })
    );

    await Promise.allSettled(task);
};
