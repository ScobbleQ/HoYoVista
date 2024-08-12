const { EmbedBuilder } = require('discord.js');
const { MongoDB } = require('./mongo');
const axios = require('axios');
const { embedColors } = require('../../../config');

/**
 * A class that enables fast communications with miHoYo's servers
 */
class HoYoLAB {
    #ltoken_v2;
    #ltuid_v2;
    #basicGameData = {};

    /**
     * A class that enables fast communications with miHoYo's servers
     * @param {string} ltoken_v2 - The ltoken_v2 cookie
     * @param {string} ltuid_v2 - The ltuid_v2 cookie
     */
    constructor(ltoken_v2, ltuid_v2) {
        this.#ltoken_v2 = ltoken_v2;
        this.#ltuid_v2 = ltuid_v2;
    }

    /**
     * Function to initialize the basic game data
     */
    async initBasicGameData() {
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

        const data = await axios.get(`https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=${this.#ltuid_v2}`, { headers });
        const info = data.data;

        info.data.list.forEach(game => {
            const gameAbbr = this.convertFullToAbbr(game.game_name);

            this.#basicGameData[gameAbbr] = {
                nickname: game.nickname || "Unknown",
                uid: game.game_role_id,
                level: game.level,
                region: game.region,
                region_name: game.region_name,
                auto_checkin: true
            };
        });
    }

    /**
     * Method to get the checkin info of the specified game
     * @param {string} gameName - The name of the game (Abr)
     * @returns {Promise<Object>} The checkin info
     */
    async getCheckinInfo(gameName) {
        const headers = {
            Accept: 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            Connection: 'keep-alive',
            Cookie: `ltoken_v2=${this.#ltoken_v2}; ltuid_v2=${this.#ltuid_v2};`,
            Origin: 'https://act.hoyolab.com',
            Referer: 'https://act.hoyolab.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
        };

        const game = await this.getGameUrl(gameName);

        const info = await axios.get(game.info, { headers });
        const infoData = info.data.data;

        const home = await axios.get(game.home);
        const homeData = home.data.data;

        return {
            month: homeData.month,
            award: homeData.awards,
            signedDays: infoData.total_sign_day,
            possibleSignedDays: parseInt(infoData.today.split("-")[2])
        };
    }

    /**
     * Performs the check-in action
     * @param {string} gameName - The name of the game (Abr)
     * @returns {Promise<Object>} The check-in status
     */
    async checkin(gameName) {
        const headers = {
            Accept: 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'keep-alive',
            'Content-Type': 'application/json;charset=utf-8',
            Cookie: `ltoken_v2=${this.#ltoken_v2}; ltuid_v2=${this.#ltuid_v2};`,
            Origin: 'https://act.hoyolab.com',
            Referer: 'https://act.hoyolab.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
        };

        const url = await this.getGameUrl(gameName);

        const rest = await axios.post(url.checkin, null, { headers });
        const data = rest.data;

        return { retcode: data.retcode, message: data.message };
    }

    /**
     * Generates the check-in embed
     * @param {string} gameName - The name of the game (Abr)
     * @param {*} user - The user object
     * @param {boolean} privacy - The privacy status
     * @returns {Promise<EmbedBuilder>} The check-in embed
     */
    async checkInGame(gameName, user, privacy) {
        let { nickname, uid } = user.linkedGamesList[gameName];
        if (privacy) {
            nickname = HoYoLAB.censorUsername(nickname);
            uid = HoYoLAB.censorUid(uid);
        }

        const status = await this.checkin(gameName);
        if (status.retcode === 0) {
            const { month, award, signedDays, possibleSignedDays } = await this.getCheckinInfo(gameName);

            const checkinEmbed = new EmbedBuilder()
                .setColor(embedColors.default)
                .setTitle('Daily Check-in Claimed')
                .setAuthor({ name: `${nickname} (${uid})`, iconURL: await this.getGameUrl(gameName).logo })
                .setDescription(`${award[signedDays - 1].name} x${award[signedDays - 1].cnt}`)
                .setThumbnail(award[signedDays - 1].icon);

            if (possibleSignedDays - signedDays > 0) {
                checkinEmbed.setFooter({ text: `You have missed ${possibleSignedDays - signedDays} day(s) this month.` });
            }

            return checkinEmbed;
        } else {
            return new EmbedBuilder()
                .setColor(embedColors.error)
                .setTitle('Daily Check-in Failed')
                .setAuthor({ name: `${nickname} (${uid})`, iconURL: await this.getGameUrl(gameName).logo })
                .setDescription(status.message);
        }
    }

    /**
     * Gets the user's basic profile data
     * @returns {Promise<Object>} The user's basic profile data
     */
    async getFullUserProfile() {    
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
            'x-rpc-language': 'en-us'
        };
    
        const data = await axios.get(`https://bbs-api-os.hoyolab.com/community/painter/wapi/user/full?scene=1&uid=${this.#ltuid_v2}`, { headers });
        return data.data;
    }

    /**
     * Gets the game record card
     * @returns {Promise<Object>} The game record card
     */
    async getGameRecordCard() {    
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
            'x-rpc-language': 'en-us'
        };
    
        const data = await axios.get(`https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=${this.#ltuid_v2}`, { headers });
        return data.data;
    }

    /**
     * Converts the full game name to its abbreviation
     * @param {string} name - The full name of the game
     * @returns {string} The abbreviation of the game
     */
    convertFullToAbbr(name) {
        const gameNames = {
            "Genshin Impact": "genshin",
            "Honkai Impact 3rd": "honkai3rd",
            "Honkai: Star Rail": "hkrpg",
            "Zenless Zone Zero": "zzz"
        };

        return gameNames[name];
    }

    /**
     * Gets the game URL
     * @param {string} gameName - The name of the game
     * @returns {Object} The game URL
     */
    getGameUrl(gameName) {
        const urls = {
            "Genshin Impact": {
                name: `Genshin Impact`,
                abbreviation: `genshin`,
                logo: `https://fastcdn.hoyoverse.com/static-resource-v2/2023/11/08/9db76fb146f82c045bc276956f86e047_6878380451593228482.png`,
                home: `https://sg-hk4e-api.hoyolab.com/event/sol/home?lang=en-us&act_id=e202102251931481`,
                info: `https://sg-hk4e-api.hoyolab.com/event/sol/info?lang=en-us&act_id=e202102251931481`,
                checkin: `https://sg-hk4e-api.hoyolab.com/event/sol/sign?lang=en-us&act_id=e202102251931481`,
                chronicle: `https://bbs-api-os.hoyolab.com/game_record/honkai3rd/api/index?server={{server}}&role_id={{uid}}`
            },
            "Honkai Impact 3rd": {
                name: `Honkai Impact 3rd`,
                abbreviation: `honkai3rd`,
                logo: `https://fastcdn.hoyoverse.com/static-resource-v2/2024/02/29/3d96534fd7a35a725f7884e6137346d1_3942255444511793944.png`,
                home: `https://sg-public-api.hoyolab.com/event/mani/home?lang=en-us&act_id=e202110291205111`,
                info: `https://sg-public-api.hoyolab.com/event/mani/info?lang=en-us&act_id=e202110291205111`,
                checkin: `https://sg-public-api.hoyolab.com/event/mani/sign?lang=en-us&act_id=e202110291205111`
            },
            "Honkai: Star Rail": {
                name: `Honkai: Star Rail`,
                abbreviation: `hkrpg`,
                logo: `https://hyl-static-res-prod.hoyolab.com/communityweb/business/starrail_hoyoverse.png`,
                home: `https://sg-public-api.hoyolab.com/event/luna/os/home?lang=en-us&act_id=e202303301540311`,
                info: `https://sg-public-api.hoyolab.com/event/luna/os/info?lang=en-us&act_id=e202303301540311`,
                checkin: `https://sg-public-api.hoyolab.com/event/luna/os/sign?lang=en-us&act_id=e202303301540311`
            },
            "Zenless Zone Zero": {
                name: `Zenless Zone Zero`,
                abbreviation: `zzz`,
                logo: `https://hyl-static-res-prod.hoyolab.com/communityweb/business/nap.png`,
                home: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/home?lang=en-us&act_id=e202406031448091`,
                info: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/info?lang=en-us&act_id=e202406031448091`,
                checkin: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign?lang=en-us&act_id=e202406031448091`
            }
        };

        return urls[Object.keys(urls).find(g => urls[g].abbreviation === gameName)];
    }

    /**
     * Method to get the game data
     * @returns {Object} The basic game data
     */
    get basicGameData() {
        return this.#basicGameData;
    }

    /**
     * Parses the cookie data
     * @param {string} data - The cookie data
     * @returns {Object} The parsed cookies
     */
    static parseCookies(data) {
        const getValue = (str, key) => {
            const match = str.match(new RegExp(`${key}=([^;]+)`));
            return match ? match[1] : null;
        };

        const ltoken_v2 = getValue(data, 'ltoken_v2');
        const ltuid_v2 = getValue(data, 'ltuid_v2');

        return { ltoken_v2: ltoken_v2, ltuid_v2: ltuid_v2 };
    }

    /**
     * Censors the UID
     * @param {string} uid - The UID to censor
     * @returns {string} The censored UID
     */
    static censorUid(uid) {
        const firstPart = uid.slice(0, 1);
        const lastPart = uid.slice(-4);
        const middlePart = uid.slice(1, -4).replace(/[0-9]/g, '*');
        return firstPart + middlePart + lastPart;
    }

    /**
     * Censors the username
     * @param {string} username - The username to censor
     * @returns {string} The censored username
     */
    static censorUsername(username) {
        if (username.length <= 2) {
            return username;
        }

        const firstLetter = username.charAt(0);
        const lastLetter = username.charAt(username.length - 1);
        const middlePart = '*'.repeat(username.length - 2);
        return firstLetter + middlePart + lastLetter;
    }

    /**
     * Concurrently checks in all users with auto check-in enabled
     * @param {*} client - Discord client
     * @param {*} dbClient - MongoDB client
     */
    static async autoCheckin(client, dbClient) {
        try {
            const usersWithAutoCheckin = await MongoDB.getUsersWithAutoCheckin(dbClient);
    
            await Promise.all(usersWithAutoCheckin.map(async (user) => {
                const { ltoken_v2, ltuid_v2 } = user.hoyolab;
                const hoyolab = new HoYoLAB(ltoken_v2, ltuid_v2);
                const notify = await MongoDB.getUserPreference(dbClient, user.id, "hoyolab.checkinNotif");
    
                await Promise.all(Object.entries(user.linkedGamesList).map(async ([game, gameData]) => {
                    if (gameData.auto_checkin) {
                        const status = await hoyolab.checkin(game);
                        const checkinEmbed = new EmbedBuilder()
                            .setAuthor({ name: `${gameData.nickname} (${gameData.uid})`, iconURL: await hoyolab.getGameUrl(game).logo });
    
                        if (status.retcode === 0) {
                            const { month, award, signedDays, possibleSignedDays } = await hoyolab.getCheckinInfo(game);
    
                            checkinEmbed
                                .setColor(embedColors.default)
                                .setTitle('Daily Check-in Claimed')
                                .setDescription(`${award[signedDays - 1].name} x${award[signedDays - 1].cnt}`)
                                .setThumbnail(award[signedDays - 1].icon);
    
                            if (possibleSignedDays - signedDays > 0) {
                                checkinEmbed.setFooter({ text: `You have missed ${possibleSignedDays - signedDays} day(s) this month.` });
                            }
                        } else {
                            checkinEmbed
                                .setColor(embedColors.error)
                                .setTitle('Daily Check-in Failed')
                                .setDescription(status.message);
                        }

                        if (notify || status.retcode !== 0) {
                            await client.users.send(user.id, { embeds: [checkinEmbed] });
                        }
                    }
                }));
            }));
        } catch (error) {
            console.error(`\x1b[31m[ERROR]\x1b[0m ${error}`);
        }
    }
}

module.exports = { HoYoLAB };