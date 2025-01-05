import { MongoDB } from '../class/mongo.js';
import { performCheckin } from '../hoyolab/checkin.js';
import { redeemCode, cleanAttemptedCodes } from '../hoyolab/redeem.js';
import logger from './logger.js';

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

    users.map(async (user) => {
        try {
            const checkin = await performCheckin({
                arrayOfGameId: Object.values(user.linked_games).map((game) => game.game_id),
                linkedGames: user.linked_games,
                hoyolabCookies: user.hoyolab_cookies,
                isPrivate: user.settings.is_private,
                to_notify_checkin: user.settings.to_notify_checkin,
                automatic: true,
            });

            if (user.settings.collect_data) {
                mongo.increment(user.discord_id, { field: 'stats.total_checkin', value: checkin.amount });
            }

            if (user.settings.to_notify_checkin) {
                try {
                    client.users.send(user.discord_id, { embeds: checkin.embeds });
                } catch (err) {
                    // no DM permission, disable notifications if enabled
                    if (err.code === 50007 && to_notify_checkin) {
                        mongo.set(user.discord_id, {
                            field: 'settings.to_notify_checkin',
                            value: false,
                        });
                    } else {
                        console.log('error sending message to ' + user.discord_id + ' with error ' + err.code);
                    }
                }
            }
        } catch (error) {
            logger.error(`Auto Checkin: Failed for user ${user.discord_id}`, {
                stack: error.stack,
            });
        }

        // clean up attempted code from db
        cleanAttemptedCodes(user.discord_id);
    });
};

export const autoRedeem = async (client) => {
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

    users.map(async (user) => {
        console.log('starting auto redeem for ' + user.discord_id);
        try {
            const redeem = await redeemCode(user.discord_id, {
                arrayOfGameId: Object.values(user.linked_games).map((game) => game.game_id),
                hoyolabCookies: user.hoyolab_cookies,
                linkedGames: user.linked_games,
                isPrivate: user.settings.is_private,
                toNotify: user.settings.to_notify_redeem,
                automatic: true,
            });

            if (user.settings.collect_data) {
                mongo.increment(user.discord_id, { field: 'stats.total_redeem', value: redeem.amount });
            }

            if (user.settings.to_notify_redeem && redeem.embeds.length > 0) {
                try {
                    client.users.send(user.discord_id, { embeds: redeem.embeds });
                } catch (err) {
                    // no DM permission, disable notifications if enabled
                    if (err.code === 50007 && to_notify_redeem) {
                        mongo.set(user.discord_id, {
                            field: 'settings.to_notify_redeem',
                            value: false,
                        });
                    } else {
                        console.log('error sending message to ' + user.discord_id + ' with error ' + err.code);
                    }
                }
            }
        } catch (error) {
            logger.error(`Auto Redeem: Failed for user ${user.discord_id}`, { stack: error.stack });
        }
    });
};
