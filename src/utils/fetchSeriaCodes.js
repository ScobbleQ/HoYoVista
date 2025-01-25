import axios from 'axios';

export const fetchSeriaCodes = async () => {
    const games = ['honkai3rd', 'genshin', 'hkrpg', 'nap'];
    const headers = { 'User-Agent': 'ScobbleQ' };

    const requests = games.map(async (game) => {
        const url = `https://hoyo-codes.seria.moe/codes?game=${game}`;
        return axios.get(url, { headers }).then(({ data }) => {
            const gameName = game === 'nap' ? 'zzz' : game;
            return {
                [gameName]: data.codes.map((code) => ({
                    id: code.id,
                    code: code.code,
                    reward: code.rewards || 'Unknown',
                })),
            };
        });
    });

    const results = await Promise.all(requests);
    return Object.assign({}, ...results);
};
