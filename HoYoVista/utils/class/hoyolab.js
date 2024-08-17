const { EmbedBuilder } = require('discord.js');
const { MongoDB } = require('./mongo');
const axios = require('axios');
const { embedColors } = require('../../../config');

/**
 * A class that enables fast communications with miHoYo's servers
 */
class HoYoLAB {
    #ltmid_v2;
    #ltoken_v2;
    #ltuid_v2;
    #cookie_token_v2;
    #basicGameData = {};

    /**
     * A class that enables fast communications with miHoYo's servers
     * @param {string} ltoken_v2 - The ltoken_v2 cookie
     * @param {string} ltuid_v2 - The ltuid_v2 cookie
     */
    constructor(ltoken_v2, ltuid_v2, cookie_token_v2, ltmid_v2) {
        this.#ltoken_v2 = ltoken_v2;
        this.#ltuid_v2 = ltuid_v2;
        this.#cookie_token_v2 = cookie_token_v2;
        this.#ltmid_v2 = ltmid_v2;
    }

    /**
     * Function to initialize the basic game data
     */
    async initBasicGameData() {
        const info = await this.getGameRecordCard();

        if (info.retcode !== 0) {
            return { retcode: info.retcode, message: info.message };
        }

        info.data.list.forEach(game => {
            const gameAbbr = this.convertFullToAbbr(game.game_name);

            this.#basicGameData[gameAbbr] = {
                nickname: game.nickname || "Unknown",
                uid: game.game_role_id,
                level: game.level,
                region: game.region,
                region_name: game.region_name,
                auto_checkin: true,
                auto_redeem: true,
                codes: []
            };
        });

        return { retcode: 0, message: 'Basic game data initialized' };
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
            Cookie: `ltmid_v2=${this.#ltmid_v2}; ltoken_v2=${this.#ltoken_v2}; ltuid_v2=${this.#ltuid_v2};`,
            Origin: 'https://act.hoyolab.com',
            Referer: 'https://act.hoyolab.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
        };

        const url = await HoYoLAB.getGameUrl(gameName);

        const rest = await axios.post(url.checkin, null, { headers });
        const data = rest.data;

        return { retcode: data.retcode, message: data.message };
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
            Cookie: `ltmid_v2=${this.#ltmid_v2}; ltoken_v2=${this.#ltoken_v2}; ltuid_v2=${this.#ltuid_v2};`,
            Origin: 'https://act.hoyolab.com',
            Referer: 'https://act.hoyolab.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
        };

        const game = await HoYoLAB.getGameUrl(gameName);

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
                .setAuthor({ name: `${nickname} (${uid})`, iconURL: await HoYoLAB.getGameUrl(gameName).logo })
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
                .setAuthor({ name: `${nickname} (${uid})`, iconURL: await HoYoLAB.getGameUrl(gameName).logo })
                .setDescription(status.message);
        }
    }

    /**
     * Performs the redeem code action
     * @param {string} gameName - The name of the game (Abr)
     * @param {string} uid - The user ID
     * @param {string} region - The region
     * @param {string} code - The code to redeem
     * @returns {Promise<Object>} The redeem status
     */
    async redeemCode(gameName, uid, region, code) {
        let headers;

        switch (gameName) {
            case 'genshin':
                headers = {
                    'Accept-Encoding': 'gzip, deflate, br',
                    'x-rpc-language': 'en-us',
                    Host: 'sg-hk4e-api.hoyolab.com',
                    Connection: 'keep-alive',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'User-Agent': 'HoYoLAB/18 CFNetwork/1498.700.2 Darwin/23.6.0',
                    Referer: 'https://app.hoyolab.com',
                    'x-rpc-channel': 'appstore',
                    Accept: '*/*',
                    Cookie: `ltoken_v2=${this.#ltoken_v2};ltuid_v2=${this.#ltuid_v2}`
                };
                break;
        }

        const urlTemplate = await HoYoLAB.getGameUrl(gameName).code;
        let url = urlTemplate
            .replace('{{uid}}', uid || '')
            .replace('{{region}}', region || '')
            .replace('{{code}}', code || '');

        if (url.includes('{{timestamp}}')) {
            url = url.replace('{{timestamp}}', Date.now());
        }

        const data = await axios.get(url, { headers });
        const info = data.data;

        return { retcode: info.retcode, message: info.message };
    }

    /**
     * Generates the redeem embed
     * @param {string} gameName - The name of the game (Abr)
     * @param {*} user - The user object
     * @param {boolean} privacy - The privacy status
     * @param {string} codes - The codes to redeem
     * @returns {Promise<EmbedBuilder[]>} The redeem embeds
     */
    async redeemAllCodes(gameName, user, privacy, codes) {
        let { nickname, uid, region } = user.linkedGamesList[gameName];
        if (privacy) {
            nickname = HoYoLAB.censorUsername(nickname);
            uid = HoYoLAB.censorUid(uid);
        }

        const embeds = [];
        for (const code of codes) {
            if (gameName === 'hkrpg' || gameName === 'zzz') {
                embeds.push(new EmbedBuilder()
                    .setColor(embedColors.error)
                    .setAuthor({ name: `${nickname} (${uid})`, iconURL: await HoYoLAB.getGameUrl(gameName).logo })
                    .setDescription('Code redemption is not supported for this game. (Yet!)'));
                continue;
            }

            const status = await this.redeemCode(gameName, uid, region, code);
            if (status.retcode === 0) {
                embeds.push(new EmbedBuilder()
                    .setColor(embedColors.success)
                    .setTitle('Code Redeemed')
                    .setAuthor({ name: `${nickname} (${uid})`, iconURL: await HoYoLAB.getGameUrl(gameName).logo })
                    .setDescription(status.message));
            } else if (status.retcode === -2003) {
                embeds.push(new EmbedBuilder()
                    .setColor(embedColors.error)
                    .setAuthor({ name: `${nickname} (${uid})`, iconURL: await HoYoLAB.getGameUrl(gameName).logo })
                    .setDescription(status.message));
            }
        }

        return embeds;
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
            Cookie: `ltmid_v2=${this.#ltmid_v2}; ltoken_v2=${this.#ltoken_v2}; ltuid_v2=${this.#ltuid_v2};`,
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
            Cookie: `ltmid_v2=${this.#ltmid_v2}; ltoken_v2=${this.#ltoken_v2}; ltuid_v2=${this.#ltuid_v2};`,
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
     * Method to get the game data
     * @returns {Object} The basic game data
     */
    get basicGameData() {
        return this.#basicGameData;
    }

    /**
    * Gets the game URL
    * @param {string} gameName - The name of the game
    * @returns {Object} The game URL
    */
    static getGameUrl(gameName) {
        const urls = {
            "Genshin Impact": {
                name: `Genshin Impact`,
                abbreviation: `genshin`,
                logo: `https://fastcdn.hoyoverse.com/static-resource-v2/2023/11/08/9db76fb146f82c045bc276956f86e047_6878380451593228482.png`,
                home: `https://sg-hk4e-api.hoyolab.com/event/sol/home?lang=en-us&act_id=e202102251931481`,
                info: `https://sg-hk4e-api.hoyolab.com/event/sol/info?lang=en-us&act_id=e202102251931481`,
                checkin: `https://sg-hk4e-api.hoyolab.com/event/sol/sign?lang=en-us&act_id=e202102251931481`,
                index: `https://bbs-api-os.hoyolab.com/game_record/genshin/api/index?server={{server}}&role_id={{uid}}`,
                rtn: `https://bbs-api-os.hoyolab.com/game_record/app/genshin/api/dailyNote?server={{server}}&role_id={{uid}}`,
                code: `https://sg-hk4e-api.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl?cdkey={{code}}&game_biz=hk4e_global&lang=en&region={{region}}&uid={{uid}}`
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
                checkin: `https://sg-public-api.hoyolab.com/event/luna/os/sign?lang=en-us&act_id=e202303301540311`,
                code: `https://sg-hkrpg-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey?t={{timestamp}}&lang=en&game_biz=hkrpg_global&uid={{uid}}&region={{region}}&cdkey={{code}}`
            },
            "Zenless Zone Zero": {
                name: `Zenless Zone Zero`,
                abbreviation: `zzz`,
                logo: `https://hyl-static-res-prod.hoyolab.com/communityweb/business/nap.png`,
                home: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/home?lang=en-us&act_id=e202406031448091`,
                info: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/info?lang=en-us&act_id=e202406031448091`,
                checkin: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign?lang=en-us&act_id=e202406031448091`,
                code: `https://public-operation-nap.hoyoverse.com/common/apicdkey/api/webExchangeCdkey?t={{timestamp}}&lang=en&game_biz=nap_global&uid={{uid}}&region={{region}}&cdkey={{code}}`
            }
        };

        return urls[Object.keys(urls).find(g => urls[g].abbreviation === gameName)];
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
        const cookie_token_v2 = getValue(data, 'cookie_token_v2');
        const ltmid_v2 = getValue(data, 'ltmid_v2');

        return { ltoken_v2: ltoken_v2, ltuid_v2: ltuid_v2, cookie_token_v2: cookie_token_v2, ltmid_v2: ltmid_v2 };
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
     * Schedules the auto check-in for a random time
     * @param {*} client - Discord client
     * @param {*} dbClient - MongoDB client
     */
    static scheduleCheckin(client, dbClient) {
        const delay = Math.floor(Math.random() * 56) * 60 * 1000;

        setTimeout(async () => {
            await HoYoLAB.autoCheckin(client, dbClient);
        }, delay);
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
                const { checkinNotif } = user.settings;
                const hoyolab = new HoYoLAB(ltoken_v2, ltuid_v2);

                const checkinEmbeds = [];

                await Promise.all(Object.entries(user.linkedGamesList).map(async ([game, gameData]) => {
                    if (gameData.auto_checkin) {
                        const status = await hoyolab.checkin(game);
                        const checkinEmbed = new EmbedBuilder()
                            .setAuthor({ name: `${gameData.nickname} (${gameData.uid})`, iconURL: await HoYoLAB.getGameUrl(game).logo });

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

                        if (checkinNotif || status.retcode !== 0) {
                            checkinEmbeds.push(checkinEmbed);
                        }
                    }
                }));

                if (checkinEmbeds.length > 0) {
                    await client.users.send(user.id, { embeds: checkinEmbeds });
                }
            }));
        } catch (error) {
            throw new Error(`Error during auto check-in: ${error}`);
        }
    }

    static async redeemCode(ltoken_v2, ltuid_v2, ltmid_v2, cookie_token_v2, game, uid, region, code) {
        let headers;
        switch (game) {
            case 'genshin':
                headers = {
                    'Accept-Encoding': 'gzip, deflate, br',
                    'x-rpc-language': 'en-us',
                    Host: 'sg-hk4e-api.hoyolab.com',
                    Connection: 'keep-alive',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'User-Agent': 'HoYoLAB/18 CFNetwork/1498.700.2 Darwin/23.6.0',
                    Referer: 'https://app.hoyolab.com',
                    'x-rpc-channel': 'appstore',
                    Accept: '*/*',
                    Cookie: `ltoken_v2=${ltoken_v2};ltuid_v2=${ltuid_v2}`
                };
                break;
            case 'hkrpg':
                headers = {
                    Accept: '*/*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US,en;q=0.9',
                    Connection: 'keep-alive',
                    Cookie: `account_id_v2=${ltuid_v2}; account_mid_v2=${ltmid_v2}; cookie_token_v2=${cookie_token_v2};`,
                    Host: 'sg-hkrpg-api.hoyoverse.com',
                    Origin: 'https://hsr.hoyoverse.com',
                    Referer: 'https://hsr.hoyoverse.com/',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
                    'x-rpc-language': 'en'
                };
                break;
            case 'zzz':
                headers = {
                    Accept: '*/*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US,en;q=0.9',
                    Connection: 'keep-alive',
                    Cookie: `account_id_v2=${ltuid_v2}; account_mid_v2=${ltmid_v2}; cookie_token_v2=${cookie_token_v2};`,
                    Host: 'public-operation-nap.hoyoverse.com',
                    Origin: 'https://zenless.hoyoverse.com',
                    Referer: 'https://zenless.hoyoverse.com/',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
                    'x-rpc-language': 'en'
                };
                break;
        }

        const urlTemplate = await HoYoLAB.getGameUrl(game).code;
        let url = urlTemplate
            .replace('{{uid}}', uid || '')
            .replace('{{region}}', region || '')
            .replace('{{code}}', code || '');

        if (url.includes('{{timestamp}}')) {
            url = url.replace('{{timestamp}}', Date.now());
        }

        const data = await axios.get(url, { headers });

        return { retcode: data.data.retcode, message: data.data.message }
    }

    static async autoRedeemCodes(client, dbClient) {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        const games = ['genshin', 'hkrpg', 'nap']
        const codeData = {};

        for (const game of games) {
            const url = `https://hoyo-codes.seriaati.xyz/codes?game=${game}`
            const data = await axios.get(url);
            const gameCodeKey = game === 'nap' ? 'zzz' : game;
            codeData[gameCodeKey] = data.data.codes.map(codeObj => codeObj.code);
        }

        const usersWithAutoRedeem = await MongoDB.getUsersWithAutoRedeem(dbClient);
        await Promise.all(usersWithAutoRedeem.map(async (user) => {
            const { ltoken_v2, ltuid_v2, ltmid_v2, cookie_token_v2 } = user.hoyolab;
            const redeemEmbed = [];

            await Promise.all(Object.entries(user.linkedGamesList).map(async ([game, gameData]) => {
                if (game === 'genshin') {
                    if (gameData.auto_redeem) {
                        const redeemedCodes = Array.isArray(gameData.codes) ? gameData.codes : [];
                        const newCodes = codeData[game].filter(code => !redeemedCodes.includes(code));

                        if (newCodes.length > 0) {
                            for (const code of newCodes) {
                                const status = await HoYoLAB.redeemCode(ltoken_v2, ltuid_v2, ltmid_v2, cookie_token_v2, game, gameData.uid, gameData.region, code);

                                if (status.retcode === 0) {
                                    redeemEmbed.push(new EmbedBuilder()
                                        .setColor(embedColors.default)
                                        .setTitle('Code Redeemed')
                                        .setAuthor({ name: `${gameData.nickname} (${gameData.uid})`, iconURL: await HoYoLAB.getGameUrl(game).logo })
                                        .setDescription(`Code: \`${code}\``)
                                    );

                                    await MongoDB.updateUserCodes(dbClient, user.id, game, code);
                                }

                                // Add to database if claimed or expired
                                if (status.retcode === -2017 || status.retcode === -2001) {
                                    await MongoDB.updateUserCodes(dbClient, user.id, game, code);
                                }

                                await delay(5000);
                            }
                        }
                    }
                }
            }));

            if (redeemEmbed.length > 0) {
                await client.users.send(user.id, { embeds: redeemEmbed });
            }
        }));
    }

    static async getGameBackground(game) {
        const data = await axios.get('https://bbs-api-os.hoyolab.com/community/painter/wapi/circle/info?with_channel=1');

        const gameName = {
            honkai3rd: 'Honkai Impact 3rd',
            genshin: 'Genshin Impact',
            hkrpg: 'Honkai: Star Rail',
            zzz: 'Zenless Zone Zero'
        }

        const gameData = data.data.data.game_list.find(g => g.name === gameName[game]);
        return gameData.bg;
    }
}

module.exports = { HoYoLAB };