import axios from 'axios';
import { WEB_HEADER, GAME_RECORD_URL } from './routes.js';

export const fetchGameRecord = async ({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang }) => {
    const headers = WEB_HEADER({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang });
    const response = await axios.get(GAME_RECORD_URL(ltuid_v2), { headers });

    if (response.status === 200) {
        return { retcode: 1, message: 'Success', data: response.data };
    } else {
        return { retcode: -1, message: 'Failed to fetch game record.', data: null };
    }
};
