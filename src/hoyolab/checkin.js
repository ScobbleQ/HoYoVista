import axios from 'axios';
import { WEB_HEADER, CHECKIN_URL, CHECKIN_DETAILS_URL, GameIconUrl } from './routes.js';
import { Game } from './constants.js';
import { censorUid } from '../utils/privacy.js';
import { EmbedBuilder } from 'discord.js';
import { embedColors } from '../../config.js';

const createEmbed = ({ nickname, uid, gameId, color, title, description, thumbnail, footer }) => {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: `${nickname} (${uid})`, iconURL: GameIconUrl[gameId] })
        .setTitle(title)
        .setDescription(description);

    if (thumbnail) embed.setThumbnail(thumbnail);
    if (footer) embed.setFooter({ text: footer });

    return embed;
};

export const performCheckin = async ({
    arrayOfGameId,
    linkedGames,
    hoyolabCookies,
    isPrivate,
    to_notify_checkin,
    automatic,
}) => {
    const { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang } = hoyolabCookies;
    const cookies = { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang };

    let successfulCheckin = 0;
    const embeds = [];

    for (const gameId of arrayOfGameId) {
        const { game_role_id, nickname, auto_checkin } = Object.values(linkedGames).find(
            (game) => game.game_id === gameId
        );
        const uid = isPrivate ? censorUid(game_role_id) : game_role_id;

        // Skip if automatic check-in is disabled
        if (automatic && !auto_checkin) continue;

        const { data } = await postCheckin(gameId, cookies);
        if (data.retcode !== 0) {
            // Skip if user has disabled check-in notifications and the check-in did not failed due to already checked in
            if (!to_notify_checkin && data.retcode !== -5003) continue;

            // Always notify user if check-in failed due to other reasons
            embeds.push(
                createEmbed({
                    nickname,
                    uid,
                    gameId,
                    color: embedColors.error,
                    title: `[${data.retcode}] Daily Check-in Failed`,
                    description: data.message,
                })
            );
            continue;
        }

        successfulCheckin++;

        // Skip if user has disabled check-in notifications (automatic only)
        if (automatic && !to_notify_checkin) continue;

        const [infoData, homeData] = await Promise.all([
            fetchCheckinInfo(gameId, cookies),
            fetchCheckinHome(gameId, cookies),
        ]);

        const today = Number(infoData.data.today.split('-')[2]);
        const missedDays = today - infoData.data.total_sign_day;
        const award = homeData.data.awards[today - 1];

        const embed = createEmbed({
            nickname,
            uid,
            gameId,
            color: embedColors.primary,
            title: 'Daily Check-in Claimed',
            description: `${award.name} x${award.cnt}`,
            thumbnail: award.icon,
            footer: missedDays > 0 ? `Missed ${missedDays} day${missedDays > 1 ? 's' : ''}` : undefined,
        });

        embeds.push(embed);
    }

    return { embeds: embeds, amount: successfulCheckin };
};

const postCheckin = async (game_id, { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang }) => {
    const headers = WEB_HEADER({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang });
    if (game_id === Game.ZZZ) {
        headers['x-rpc-platform'] = '4';
        headers['x-rpc-signgame'] = 'zzz';
    } else if (game_id === Game.STARRAIL) {
        headers['x-rpc-platform'] = '4';
        headers['x-rpc-signgame'] = 'hkrpg';
    }

    let requestData;
    if (game_id === Game.GENSHIN) {
        requestData = { act_id: 'e202102251931481' };
    } else if (game_id === Game.STARRAIL) {
        requestData = { act_id: 'e202303301540311', lang: 'en-us' };
    } else if (game_id === Game.HONKAI) {
        requestData = { act_id: 'e202110291205111' };
    } else if (game_id === Game.ZZZ) {
        requestData = { act_id: 'e202406031448091', lang: 'en-us' };
    }

    const url = CHECKIN_URL({ type: 'sign', game: game_id, lang: mi18nLang });

    try {
        const response = await axios.post(url, requestData, { headers });
        return { retcode: 1, message: 'Success', data: response.data };
    } catch {
        return { retcode: -1, message: 'Failed to check-in', data: null };
    }
};

const fetchCheckinInfo = async (game_id, { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang }) => {
    const headers = WEB_HEADER({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang });
    if (game_id === Game.ZZZ) {
        headers['x-rpc-signgame'] = 'zzz';
    } else if (game_id === Game.STARRAIL) {
        headers['x-rpc-signgame'] = 'hkrpg';
    }

    const url = CHECKIN_DETAILS_URL({ type: 'info', game: game_id, lang: mi18nLang });

    try {
        const response = await axios.get(url, { headers });
        return { retcode: 1, message: 'Success', data: response.data.data };
    } catch {
        return { retcode: -1, message: 'Failed to fetch check-in info', data: null };
    }
};

export const fetchCheckinHome = async (game_id, { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang }) => {
    const headers = WEB_HEADER({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang });
    if (game_id === Game.ZZZ) {
        headers['x-rpc-signgame'] = 'zzz';
    } else if (game_id === Game.STARRAIL) {
        headers['x-rpc-signgame'] = 'hkrpg';
    }

    const url = CHECKIN_DETAILS_URL({ type: 'home', game: game_id, lang: mi18nLang });

    try {
        const response = await axios.get(url, { headers });
        return { retcode: 1, message: 'Success', data: response.data.data };
    } catch {
        return { retcode: -1, message: 'Failed to fetch check-in home', data: null };
    }
};
