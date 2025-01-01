import { MongoDB } from '../class/mongo.js';
import { AbbrToFull } from './constants.js';

const memoryCache = new Map();

const mapGames = (games, exclude) => {
	return Object.entries(games)
		.filter(([, game]) => !exclude.includes(game.game_id))
		.map(([key, game]) => ({
			name: `${AbbrToFull[key]} (${game.game_role_id})`,
			user: game.nickname,
			uid: game.game_role_id,
			id: game.game_id,
		}));
};

export const fetchLinkedAccount = async (id, { exclude = [] } = {}) => {
	const cacheKey = `user:${id}:linked_games`;

	if (memoryCache.has(cacheKey)) {
		const cachedGames = memoryCache.get(cacheKey);
		const result = mapGames(cachedGames, exclude);
		return result.length === 0
			? { retcode: 0, message: 'No supported linked accounts found.' }
			: { retcode: 1, message: 'Success', data: result };
	}

	const mongo = MongoDB.getInstance();

	const user = await mongo.getUserData(id);
	if (user.retcode === -1) {
		return { retcode: -1, message: 'No accounts found.', data: null };
	}
	if (!user.data.linked_games) {
		return { retcode: -1, message: 'No linked games found.', data: null };
	}

	const linkedGames = user.data.linked_games;
	memoryCache.set(cacheKey, linkedGames);
	setTimeout(() => memoryCache.delete(cacheKey), 300000);

	const result = mapGames(linkedGames, exclude);
	return result.length === 0
		? { retcode: 0, message: 'No supported linked accounts found.' }
		: { retcode: 1, message: 'Success', data: result };
};