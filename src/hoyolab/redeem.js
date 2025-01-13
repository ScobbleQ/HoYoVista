import axios from 'axios';
import { fetchSeriaCodes } from '../utils/fetchSeriaCodes.js';
import { censorUid } from '../utils/privacy.js';
import { REDEEM_URL, GAME_BIZS, APP_HEADER, GameIconUrl } from './routes.js';
import { Game, IdToAbbr } from './constants.js';
import { EmbedBuilder } from 'discord.js';
import { embedColors } from '../../config.js';
import { MongoDB } from '../class/mongo.js';

export const redeemCode = async (
    id,
    { arrayOfGameId, hoyolabCookies, linkedGames, isPrivate, toNotify, automatic }
) => {
    const mongo = MongoDB.getInstance();
    const availableCodes = await fetchSeriaCodes();
    const cookies = { ...hoyolabCookies };

    let successfulRedeems = 0;
    const attemptedCodes = [];
    const embeds = [];

    const linkedGamesMap = Object.fromEntries(Object.values(linkedGames).map((game) => [game.game_id, game]));

    await Promise.all(
        arrayOfGameId.map(async (gameId) => {
            const gameData = linkedGamesMap[gameId];
            if (!gameData) return; // Skip if game data isn't found

            const { game_role_id, nickname, region, auto_redeem, attempted_codes } = gameData;
            const uid = isPrivate ? censorUid(game_role_id) : game_role_id;

            // skip if cron job (automatic) is running but auto_redeem is disabled
            if (automatic && !auto_redeem) return;

            // fetch unredeemed codes for this game
            const gameKey = Object.keys(linkedGames).find((key) => key === IdToAbbr[gameId]);
            const unredeemedCodes =
                availableCodes[gameKey]?.filter((code) => !attempted_codes.includes(code.code)) || [];

            await Promise.all(
                unredeemedCodes.map(async (code) => {
                    // special handling for honkai
                    if (gameId === Game.HONKAI) {
                        if (!automatic || (automatic && toNotify)) {
                            embeds.push(
                                new EmbedBuilder()
                                    .setColor(embedColors.primary)
                                    .setTitle('New Code Available')
                                    .setDescription(`Code: ${code.code}\nReward: ${code.reward}`)
                                    .setFooter({ text: 'Please redeem manually in-game.' })
                            );
                        }

                        attemptedCodes.push(code.code);
                        mongo.push(id, {
                            field: `linked_games.${gameKey}.attempted_codes`,
                            value: code.code,
                        });

                        return;
                    }

                    const { data } = await postRedeem(gameId, uid, region, code.code, cookies);

                    if (data.retcode === 0) {
                        // not automatic, notify user of successful redemption
                        // automatic, notify user if toNotify is true
                        if (!automatic || (automatic && toNotify)) {
                            embeds.push(
                                new EmbedBuilder()
                                    .setColor(embedColors.primary)
                                    .setAuthor({
                                        name: `${nickname} (${uid})`,
                                        iconURL: GameIconUrl[gameId],
                                    })
                                    .setTitle('Code Redeemed')
                                    .setDescription(`Code: ${code.code}\nReward: ${code.reward}`)
                            );
                        }

                        successfulRedeems++;
                    } else if (data.retcode === -1075) {
                        // no character on server, disable auto redeem
                        await mongo.set(id, {
                            field: `linked_games.${gameKey}.auto_redeem`,
                            value: false,
                        });
                    } else {
                        // not automatic, notify user of failed redemption
                        if (!automatic) {
                            embeds.push(
                                new EmbedBuilder()
                                    .setColor(embedColors.error)
                                    .setTitle(`[${data.retcode}] ${code.code}`)
                                    .setDescription(data.message)
                            );
                        }
                    }

                    attemptedCodes.push(code.code);
                    mongo.push(id, {
                        field: `linked_games.${gameKey}.attempted_codes`,
                        value: code.code,
                    });

                    // sleep for 5 seconds to prevent rate limiting
                    await new Promise((resolve) => setTimeout(resolve, 5005));
                })
            );
        })
    );

    return { embeds, amount: successfulRedeems, attempted: attemptedCodes };
};

const postRedeem = async (game_id, uid, region, code, { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang }) => {
    const url = REDEEM_URL({ game_id });

    const headers = APP_HEADER({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang });
    if (game_id === Game.GENSHIN) {
        headers['Host'] = 'sg-hk4e-api.hoyolab.com';
    } else if (game_id === Game.STARRAIL) {
        headers['Accept'] = '*/*';
        headers['Host'] = 'sg-hkrpg-api.hoyolab.com';
    } else if (game_id === Game.ZZZ) {
        headers['Accept'] = '*/*';
        headers['Host'] = 'public-operation-nap.hoyolab.com';
    }

    const params = {
        t: Date.now(),
        lang: 'en',
        game_biz: GAME_BIZS[game_id],
        uid: uid,
        region: region,
        cdkey: code,
    };

    try {
        const response = await axios.get(url, { headers, params });
        return { retcode: 1, message: 'Success', data: response.data };
    } catch {
        return { retcode: -1, message: 'Failed to redeem code', data: null };
    }
};

export const cleanAttemptedCodes = async (id) => {
    const activeCodes = await fetchSeriaCodes();

    const mongo = MongoDB.getInstance();
    const { data: user } = await mongo.getUserData(id);
    const linkedGames = user.linked_games;

    for (const [gameKey, gameData] of Object.entries(linkedGames)) {
        const activeGameCodes = activeCodes[gameKey]?.map((code) => code.code) || [];
        const cleanedAttemptedCodes = gameData.attempted_codes.filter((code) => activeGameCodes.includes(code));

        if (cleanedAttemptedCodes.length !== gameData.attempted_codes.length) {
            await mongo.set(id, {
                field: `linked_games.${gameKey}.attempted_codes`,
                value: cleanedAttemptedCodes,
            });
        }
    }
};
