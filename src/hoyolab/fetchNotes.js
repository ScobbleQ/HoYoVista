import axios from 'axios';
import { APP_HEADER, WEB_HEADER, DAILY_NOTE_URL } from '../utils/routes.js';
import { Game } from './constants.js';
import crypto from 'crypto';

export const fetchNotes = async (
	{ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang },
	{ game_id, region, game_role_id },
) => {
	const url = DAILY_NOTE_URL({ game_id, region, game_role_id });
	const headers = game_id == Game.GENSHIN ?
		APP_HEADER({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang }) :
		WEB_HEADER({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang });

	if (game_id === Game.STARRAIL || game_id === Game.HONKAI) {
		headers['DS'] = generateDS();
	}

	try {
		const response = await axios.get(url, { headers });

		return { retcode: 1, message: 'Success', data: response.data };
	}
	catch {
		return { retcode: -1, message: 'Failed to fetch game notes', data: null };
	}
};

const generateDS = () => {
	const salt = 'IZPgfb0dRPtBeLuFkdDznSZ6f4wWt6y2';
	const date = new Date();
	const time = Math.floor(date.getTime() / 1000);

	let random = '';
	const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	for (let i = 0; i < 6; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		random += characters.charAt(randomIndex);
	}

	const hash = crypto.createHash('md5')
		.update(`salt=${salt}&t=${time}&r=${random}`)
		.digest('hex');

	return `${time},${random},${hash}`;
};