const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MongoDB } = require('./mongo');
const axios = require('axios');
const crypto = require('crypto');
const { getAvailableCodes } = require('../utils/getAvailableCodes');
const { embedColors } = require('../../config');

/**
 * A class that enables fast communications with miHoYo's servers
 */
class HoYoLAB {
    #ltmid_v2;
    #ltoken_v2;
    #ltuid_v2;
    #stoken;
    #basicGameData = {};

    /**
     * A class that enables fast communications with miHoYo's servers
     * @param {string} ltoken_v2 - The ltoken_v2 cookie
     * @param {string} ltuid_v2 - The ltuid_v2 cookie
     * @param {string} ltmid_v2 - The ltmid_v2 cookie
     * @param {string} stoken - The stoken cookie
     */
    constructor(ltoken_v2, ltuid_v2, ltmid_v2, stoken) {
        this.#stoken = stoken;
        this.#ltoken_v2 = ltoken_v2;
        this.#ltuid_v2 = ltuid_v2;
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
     * Redeems all the codes
     * @param {*} dbClient - MongoDB client
     * @param {*} user - The user object
     * @param {Boolean} privacy - The privacy status
     * @param {*} codes - The codes to redeem
     * @returns {Promise<Array<EmbedBuilder>>} The redemption embeds
     */
    async redeemAllCodes(dbClient, user, privacy, codes) {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        const gameName = Object.keys(codes)[0];
        const gameCodes = codes[gameName];
        const embeds = [];

        let { nickname, uid, region } = user.linkedGamesList[gameName];
        if (privacy) {
            nickname = HoYoLAB.censorUsername(nickname);
            uid = HoYoLAB.censorUid(uid);
        }

        for (const code of gameCodes) {
            const status = await HoYoLAB.redeemCode(this.#ltoken_v2, this.#ltuid_v2, gameName, uid, region, code);

            if (status.retcode === 0) {
                embeds.push(new EmbedBuilder()
                    .setColor(embedColors.default)
                    .setTitle('Code Redeemed')
                    .setAuthor({ name: `${nickname} (${uid})`, iconURL: await HoYoLAB.getGameUrl(gameName).logo })
                    .setDescription(`Code: \`${code}\``)
                );

                await MongoDB.updateUserCodes(dbClient, user.id, gameName, code);
            } else {
                embeds.push(new EmbedBuilder()
                    .setColor(embedColors.error)
                    .setAuthor({ name: `${nickname} (${uid})`, iconURL: await HoYoLAB.getGameUrl(gameName).logo })
                    .setDescription(`Code: \`${code}\`\n` + status.message)
                );

                if ([-2017, -2018, -2019, -2020, -2006].includes(status.retcode)) {
                    await MongoDB.updateUserCodes(dbClient, user.id, gameName, code);
                }
            }

            await delay(5000);
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
    * Gets the game URLs using abbreviations
    * @param {string} gameName - The name of the game
    * @returns {Object} The game URL
    */
    static getGameUrl(gameName) {
        const urls = {
            "Genshin Impact": {
                name: `Genshin Impact`,
                abbreviation: `genshin`,
                emoji: `<:GenshinImpact:1277004066794242220>`,
                logo: `https://fastcdn.hoyoverse.com/static-resource-v2/2023/11/08/9db76fb146f82c045bc276956f86e047_6878380451593228482.png`,
                home: `https://sg-hk4e-api.hoyolab.com/event/sol/home?lang=en-us&act_id=e202102251931481`,
                info: `https://sg-hk4e-api.hoyolab.com/event/sol/info?lang=en-us&act_id=e202102251931481`,
                checkin: `https://sg-hk4e-api.hoyolab.com/event/sol/sign?lang=en-us&act_id=e202102251931481`,
                index: `https://bbs-api-os.hoyolab.com/game_record/genshin/api/index?server={{server}}&role_id={{uid}}`,
                rtn: `https://bbs-api-os.hoyolab.com/game_record/app/genshin/api/dailyNote?server={{server}}&role_id={{uid}}`,
                code: `https://sg-hk4e-api.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl`,
                redemption: `https://genshin.hoyoverse.com/en/gift?code=`
            },
            "Honkai Impact 3rd": {
                name: `Honkai Impact 3rd`,
                abbreviation: `honkai3rd`,
                emoji: `<:HonkaiImpact3rd:1277004050356764702>`,
                logo: `https://fastcdn.hoyoverse.com/static-resource-v2/2024/02/29/3d96534fd7a35a725f7884e6137346d1_3942255444511793944.png`,
                home: `https://sg-public-api.hoyolab.com/event/mani/home?lang=en-us&act_id=e202110291205111`,
                info: `https://sg-public-api.hoyolab.com/event/mani/info?lang=en-us&act_id=e202110291205111`,
                checkin: `https://sg-public-api.hoyolab.com/event/mani/sign?lang=en-us&act_id=e202110291205111`
            },
            "Honkai: Star Rail": {
                name: `Honkai: Star Rail`,
                abbreviation: `hkrpg`,
                emoji: `<:HonkaiStarRail:1277004079226294363>`,
                logo: `https://hyl-static-res-prod.hoyolab.com/communityweb/business/starrail_hoyoverse.png`,
                home: `https://sg-public-api.hoyolab.com/event/luna/os/home?lang=en-us&act_id=e202303301540311`,
                info: `https://sg-public-api.hoyolab.com/event/luna/os/info?lang=en-us&act_id=e202303301540311`,
                checkin: `https://sg-public-api.hoyolab.com/event/luna/os/sign?lang=en-us&act_id=e202303301540311`,
                code: `https://sg-hkrpg-api.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl`,
                redemption: `https://hsr.hoyoverse.com/gift?code=`
            },
            "Zenless Zone Zero": {
                name: `Zenless Zone Zero`,
                abbreviation: `zzz`,
                emoji: `<:ZenlessZoneZero:1277004094070063134>`,
                logo: `https://hyl-static-res-prod.hoyolab.com/communityweb/business/nap.png`,
                home: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/home?lang=en-us&act_id=e202406031448091`,
                info: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/info?lang=en-us&act_id=e202406031448091`,
                checkin: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign?lang=en-us&act_id=e202406031448091`,
                code: `https://public-operation-nap.hoyoverse.com/common/apicdkey/api/webExchangeCdkeyHyl`,
                redemption: `https://zenless.hoyoverse.com/redemption?code=`
            }
        };

        const game = Object.values(urls).find(g => g.abbreviation === gameName || g.name === gameName);
        return game;
    }

    /**
     * Parses the cookie data
     * @param {string} data - The cookie data
     * @returns {Object} The parsed cookies
     */
    static async parseCookies(data) {
        const getValue = (str, key) => {
            const match = str.match(new RegExp(`${key}=([^;]+)`));
            return match ? match[1] : null;
        };

        const stoken = getValue(data, 'stoken');
        const ltmid_v2 = getValue(data, 'ltmid_v2') || getValue(data, 'mid');

        if (stoken) {
            const { ltoken_v2, ltuid_v2 } = await HoYoLAB.fetch_cookie_with_stoken_v2(stoken, ltmid_v2);

            return {
                ltoken_v2: ltoken_v2,
                ltuid_v2: ltuid_v2,
                ltmid_v2: ltmid_v2,
                stoken: stoken
            };
        }

        const ltoken_v2 = getValue(data, 'ltoken_v2');
        const ltuid_v2 = getValue(data, 'ltuid_v2');

        return {
            ltoken_v2: ltoken_v2,
            ltuid_v2: ltuid_v2,
            ltmid_v2: ltmid_v2,
            stoken: null
        };
    }

    /**
     * Fetches the cookie data with the stoken
     * @param {string} stoken - The stoken
     * @param {string} mid - The mid
     * @returns {Promise<Object>} The cookie data
     */
    static async fetch_cookie_with_stoken_v2(stoken, mid) {
        const url = 'https://sg-public-api.hoyoverse.com/account/ma-passport/token/getBySToken';

        const headers = {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive",
            "Content-Length": "25",
            "Content-Type": "application/json",
            "Cookie": `stoken=${stoken};mid=${mid}`,
            "DS": HoYoLAB.generateDS(),
            "Host": "sg-public-api.hoyoverse.com",
            "User-Agent": "HoYoLAB/18 CFNetwork/1498.700.2 Darwin/23.6.0",
            "x-rpc-app_id": "c9oqaq3s3gu8",
            "x-rpc-app_version": "1.5.0",
            "x-rpc-client_type": "5",
            "x-rpc-language": "en",
        };

        const body = { "dst_token_types": [2, 4] };

        const data = await axios.post(url, body, { headers });

        return {
            retcode: data.data.retcode,
            ltuid_v2: data.data.data.user_info.aid,
            ltoken_v2: data.data.data.tokens[0].token,
            cookie_token_v2: data.data.data.tokens[1].token
        }
    }

    /**
     * Generates the DS
     * @returns {string} The generated DS
     */
    static generateDS() {
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

    /**
     * Redeems the given code
     * @param {string} ltoken_v2 - The ltoken_v2 cookie
     * @param {string} ltuid_v2 - The ltuid_v2 cookie
     * @param {string} game - The game to redeem the code for
     * @param {number} uid - The UID of the user
     * @param {string} region - The region of the user
     * @param {string} code - The code to redeem
     * @returns {Promise<Object>} The redemption status
     */
    static async redeemCode(ltoken_v2, ltuid_v2, game, uid, region, code) {
        const url = await HoYoLAB.getGameUrl(game).code;

        const baseHeaders = {
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive",
            "Cookie": `ltoken_v2=${ltoken_v2};ltuid_v2=${ltuid_v2}`,
            "Referer": "https://app.hoyolab.com",
            "x-rpc-channel": "appstore",
            "User-Agent": "HoYoLAB/18 CFNetwork/1498.700.2 Darwin/23.6.0"
        };

        const gameHeaders = {
            genshin: {
                "Accept": "application/json, text/plain, */*",
                "Host": "sg-hk4e-api.hoyolab.com"
            },
            hkrpg: {
                "Accept": "*/*",
                "Host": "sg-hkrpg-api.hoyolab.com"
            },
            zzz: {
                "Accept": "*/*",
                "Host": "public-operation-nap.hoyolab.com"
            }
        };

        const headers = { ...baseHeaders, ...gameHeaders[game] };

        const gameBizMap = {
            genshin: 'hk4e_global',
            hkrpg: 'hkrpg_global',
            zzz: 'nap_global'
        };

        const params = {
            t: Date.now(),
            lang: "en",
            game_biz: gameBizMap[game],
            uid: uid,
            region: region,
            cdkey: code
        };

        const { data } = await axios.get(url, { headers, params });
        return { retcode: data.retcode, message: data.message };
    }

    /**
     * Automatically redeems the codes for all users with auto redeem enabled
     * @param {*} client - Discord client
     * @param {*} dbClient - MongoDB client
     * @param {*} codeData - The code data
     */
    static async autoRedeemCodes(client, dbClient, codeData) {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        const usersWithAutoRedeem = await MongoDB.getUsersWithAutoRedeem(dbClient);

        await Promise.all(usersWithAutoRedeem.map(async (user) => {
            const { ltoken_v2, ltuid_v2 } = user.hoyolab;
            const redeemEmbed = [];
            const buttons = [];

            await Promise.all(Object.entries(user.linkedGamesList).map(async ([game, gameData]) => {
                if (!gameData.auto_redeem) return;

                const redeemedCodes = Array.isArray(gameData.codes) ? gameData.codes : [];
                const newCodes = codeData[game].filter(code => !redeemedCodes.includes(code));
                const gameUrl = await HoYoLAB.getGameUrl(game);
                const gameLogo = gameUrl.logo;

                if (newCodes.length > 0) {
                    for (const code of newCodes) {
                        if (game === 'honkai3rd') {
                            redeemEmbed.push(new EmbedBuilder()
                                .setColor(embedColors.default)
                                .setTitle('New Codes Available!')
                                .setAuthor({ name: `${gameData.nickname} (${gameData.uid})`, iconURL: gameLogo })
                                .setDescription(`Code: \`${code}\``)
                            );

                            buttons.push(new ButtonBuilder()
                                .setLabel(code)
                                .setURL(gameUrl.redemption + code)
                                .setStyle(ButtonStyle.Link)
                            );

                            await MongoDB.updateUserCodes(dbClient, user.id, game, code);
                        } else {
                            const status = await HoYoLAB.redeemCode(ltoken_v2, ltuid_v2, game, gameData.uid, gameData.region, code);
                            console.log(user.id, game, code, status.retcode, status.message);
                            if (status.retcode === 0) {
                                redeemEmbed.push(new EmbedBuilder()
                                    .setColor(embedColors.default)
                                    .setTitle('Code Redeemed')
                                    .setAuthor({ name: `${gameData.nickname} (${gameData.uid})`, iconURL: gameLogo })
                                    .setDescription(`Code: \`${code}\``)
                                );

                                await MongoDB.updateUserCodes(dbClient, user.id, game, code);
                            }

                            if ([-2017, -2018, -2019, -2020, -2006].includes(status.retcode)) {
                                await MongoDB.updateUserCodes(dbClient, user.id, game, code);
                            }

                            await delay(5005);
                        }
                    }
                }
            }));

            if (redeemEmbed.length > 0) {
                const rows = buttons.reduce((acc, button, index) => {
                    const rowIndex = Math.floor(index / 5);
                    if (!acc[rowIndex]) acc[rowIndex] = new ActionRowBuilder();
                    acc[rowIndex].addComponents(button);
                    return acc;
                }, []);

                await client.users.send(user.id, {
                    embeds: redeemEmbed,
                    components: rows
                });
            }
        }));
    }

    /**
     * Runs the code redemption tasks, and syncs the codes with the database
     * @param {*} client - Discord client
     * @param {*} dbClient - MongoDB client
     */
    static async scheduleRedeemCodes(client, dbClient) {
        const delay = Math.floor(Math.random() * 56) * 60 * 1000;

        setTimeout(async () => {
            const newCodes = await getAvailableCodes();

            await HoYoLAB.autoRedeemCodes(client, dbClient, newCodes);
            await MongoDB.syncCodes(dbClient, newCodes);
        }, delay);
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

    /**
     * Updates the cookie token
     * @param {*} dbClient - MongoDB client
     * @param {*} userId - The user ID
     */
    static async updateCookieToken(dbClient, userId) {
        const database = dbClient.db('users');
        const collection = database.collection('hoyoverse');

        if (userId) {
            const user = await collection.findOne({ id: userId });

            if (user.hoyolab.stoken) {
                const { cookie_token_v2 } = await HoYoLAB.fetch_cookie_with_stoken_v2(user.hoyolab.stoken, user.hoyolab.ltmid_v2);

                await collection.updateOne(
                    { id: userId },
                    { $set: { "hoyolab.cookie_token_v2": cookie_token_v2 } }
                );
            }
        } else {
            const users = await collection.find().toArray();

            await Promise.all(users.map(async (user) => {
                if (user.hoyolab.stoken) {
                    const { cookie_token_v2 } = await HoYoLAB.fetch_cookie_with_stoken_v2(user.hoyolab.stoken, user.hoyolab.ltmid_v2);

                    await collection.updateOne(
                        { id: user.id },
                        { $set: { "hoyolab.cookie_token_v2": cookie_token_v2 } }
                    );
                }
            }));
        }
    }
}

module.exports = { HoYoLAB };