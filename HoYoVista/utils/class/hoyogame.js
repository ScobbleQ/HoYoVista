const { HoYoLAB } = require('./hoyolab');
const axios = require('axios');

class HoYoGame extends HoYoLAB {
    game;
    nickname;
    uid;
    level;
    region;
    #ltoken_v2;
    #ltuid_v2;

    constructor(ltoken_v2, ltuid_v2, user, game) {
        super(ltoken_v2, ltuid_v2);

        this.game = game;
        this.nickname = user.nickname;
        this.uid = user.uid;
        this.level = user.level;
        this.region = user.region;

        this.#ltoken_v2 = ltoken_v2;
        this.#ltuid_v2 = ltuid_v2;
    }

    /**
     * Get basic Genshin data (characters, stats, exploration, serenitea)
     * @returns {Promise<{retcode: number, message: string, data: object}>} 
     */
    async getGenshinData() {
        const headers = {
            Accept: 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            Connection: 'keep-alive',
            Cookie: `ltoken_v2=${this.#ltoken_v2}; ltuid_v2=${this.#ltuid_v2};`,
            Host: 'bbs-api-os.hoyolab.com',
            Origin: 'https://act.hoyolab.com',
            Referer: 'https://act.hoyolab.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
            'x-rpc-lang': 'en-us',
            'x-rpc-language': 'en-us'
        };

        const url = await HoYoLAB.getGameUrl(this.game).index.replace('{{server}}', this.region).replace('{{uid}}', this.uid);
        const data = await axios.get(url, { headers });
        const info = data.data;

        return { retcode: info.retcode, message: info.message, data: info.data };
    }

    /**
     * Get Genshin Real-Time Notes data
     * @returns {Promise<{retcode: number, message: string, data: object}>}
     */
    async getGenshinRTN() {
        const headers = {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
            'Accept-Language': 'en-US,en;q=0.9',
            Connection: 'keep-alive',
            Cookie: `ltoken_v2=${this.#ltoken_v2}; ltuid_v2=${this.#ltuid_v2};`,
            'Access-Control-Allow-Origin': 'https://act.hoyolab.com',
            'Vary': 'Accept-Encoding',
            'X-Powered-By': 'takumi'
        };

        const url = await HoYoLAB.getGameUrl(this.game).rtn.replace('{{server}}', this.region).replace('{{uid}}', this.uid);
        const data = await axios.get(url, { headers });
        const info = data.data;

        return { retcode: info.retcode, message: info.message, data: info.data };
    }

    async getGenshinCharacters() {

    }

    async getGenshinSpiral() {

    }
}

module.exports = { HoYoGame };