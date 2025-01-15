import axios from 'axios';
import { Game } from './constants.js';
import { infoLedgerUrl, APP_HEADER, HK4E_API, PUBLIC_API } from './routes.js';

export const fetchLedger = async (
    month,
    { ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang },
    { game_id, region, game_role_id }
) => {
    if (game_id === Game.STARRAIL || game_id === Game.ZZZ) {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const year = now.getFullYear() - (parseInt(month, 10) > currentMonth ? 1 : 0);
        month = `${year}${month.padStart(2, '0')}`;
    }

    const url = infoLedgerUrl({ game_id, region, game_role_id, month, lang: mi18nLang });

    const headers = APP_HEADER({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang });
    headers['Referer'] = 'https://act.hoyolab.com/';
    delete headers['x-rpc-channel'];

    if (game_id === Game.GENSHIN) {
        headers['Host'] = HK4E_API;
    } else if (game_id === Game.ZZZ) {
        headers['Host'] = PUBLIC_API;
    } else if (game_id === Game.STARRAIL) {
        headers['Host'] = PUBLIC_API;
        headers['Accept'] = '*/*';
    }

    try {
        // using node:fetch since axios giving issues -- swap to axios if possible
        const responsed = await fetch(url, {
            method: 'GET',
            headers,
        });
        const data = await responsed.json();

        return { retcode: 1, message: 'Success', data: data };
    } catch (error) {
        return { retcode: -1, message: 'Failed to fetch ledger data', data: null };
    }
};
