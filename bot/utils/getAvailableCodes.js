const axios = require('axios');

async function getAvailableCodes() {
	const games = ['honkai3rd', 'genshin', 'hkrpg', 'nap'];
	const codeData = {};

	for (const game of games) {
		const url = `http://hoyo-codes.seria.moe/codes?game=${game}`;
		const headers = { 'User-Agent': 'ScobbleQ' };

		const data = await axios.get(url, { headers });

		const gameCodeKey = game === 'nap' ? 'zzz' : game;
		codeData[gameCodeKey] = data.data.codes.map(codeObj => codeObj.code);
	}

	return codeData;
}

module.exports = { getAvailableCodes };