import axios from 'axios';
import { APP_HEADER, WEB_HEADER, DAILY_NOTE_URL } from './routes.js';
import { Game } from './constants.js';
import { generateDS } from '../utils/generateDS.js';

export const fetchNotes = async ({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang }, { game_id, region, game_role_id }) => {
    const url = DAILY_NOTE_URL({ game_id, region, game_role_id });
    const headers =
        game_id == Game.GENSHIN
            ? APP_HEADER({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang })
            : WEB_HEADER({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang });

    if (game_id === Game.STARRAIL) {
        headers['DS'] = generateDS();
        headers['x-rpc-client_type'] = '5';
        headers['Referer'] = 'https://act.hoyolab.com/';
        headers['x-rpc-app_version'] = '1.5.0';
    }

    try {
        const response = await axios.get(url, { headers });

        return { retcode: 1, message: 'Success', data: response.data };
    } catch {
        return { retcode: -1, message: 'Failed to fetch game notes', data: null };
    }
};
