import axios from 'axios';
import { WEB_HEADER, GAME_INDEX_URL } from '../utils/routes.js';

export const fetchGameIndex = async ({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang }, { game_id, region, game_role_id }) => {
	const headers = WEB_HEADER({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang });
	const url = GAME_INDEX_URL({ game_id, region, game_role_id });
	const response = await axios.get(url, { headers });

	if (response.status === 200) {
		return { retcode: 1, message: 'Success', data: response.data };
	}
	else {
		return { retcode: -1, message: 'Failed to fetch game index.', data: null };
	}
};