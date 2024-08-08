const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { getSpecificProjection, getUserData, getUserNotifPreference, getUserPrivacyPreference } = require('./mongo');
const { getGameUrl } = require('./getGameUrl');
const { censorUid, censorUsername } = require('./censorInformation');

/**
 * Get check-in information
 * @param {string} gameName - The name of the game
 * @param {string} ltoken_v2 - The ltoken_v2 cookie
 * @param {string} ltuid_v2 - The ltuid_v2 cookie
 * @returns The award for the check-in
 */
async function getCheckinInfo(gameName, ltoken_v2, ltuid_v2) {
    const headers = {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        Connection: 'keep-alive',
        Cookie: `ltoken_v2=${ltoken_v2}; ltuid_v2=${ltuid_v2};`,
        Origin: 'https://act.hoyolab.com',
        Referer: 'https://act.hoyolab.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
    };

    const game = await getGameUrl(gameName);

    // TOTAL DAYS
    const info = await axios.get(game.info, { headers });
    const signedDays = info.data.data.total_sign_day;

    // REWARDS
    const home = await axios.get(game.home);
    const homeData = home.data;
    const award = homeData.data.awards[signedDays - 1];

    return { award };
}

/**
 * Check-in to a game
 * @param {string} gameName - The name of the game
 * @param {string} ltoken_v2 - The ltoken_v2 cookie
 * @param {string} ltuid_v2 - The ltuid_v2 cookie
 * @returns Daily check-in status code and message
 */
async function hoyolabCheckin(gameName, ltoken_v2, ltuid_v2) {
    const headers = {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        Connection: 'keep-alive',
        Cookie: `ltoken_v2=${ltoken_v2}; ltuid_v2=${ltuid_v2};`,
        Origin: 'https://act.hoyolab.com',
        Referer: 'https://act.hoyolab.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
    };

    const game = await getGameUrl(gameName);
    
    const rest = await axios.post(game.checkin, null, { headers });
    const data = rest.data;

    const retcode = data.retcode;
    const message = data.message;

    return { retcode, message };
}

/**
 * Search for users that have auto check-in enabled and claim the reward
 * @param {*} interaction - Discord command interaction
 * @param {*} dbClient - MongoDB client
 * @param {string} discordID - Discord ID
 */
async function checkinEveryGame(interaction, dbClient, discordID) {
    const user = await getUserData(dbClient, discordID);

    let isFirstGame = true;
    const hoyolab = user.hoyoverse.hoyolab;
    const { ltoken_v2, ltuid_v2 } = hoyolab;
    for (const key in user.hoyoverse) {
        if (key !== 'hoyolab') {
            const gameName = {
                hi3: 'Honkai Impact 3rd',
                gi: 'Genshin Impact',
                hsr: 'Honkai: Star Rail',
                zzz: 'Zenless Zone Zero'
            }

            const selectedGameName = gameName[key];
            const { retcode, message } = await hoyolabCheckin(selectedGameName, ltoken_v2, ltuid_v2);
            const database = await getSpecificProjection(dbClient, user.discordID, key);
            let { username, uid } = database.hoyoverse[key];

            if (await getUserPrivacyPreference(dbClient, user.discordID)) {
                username = censorUsername(username);
                uid = censorUid(uid);
            }

            let checkinEmbed;
            if (retcode === 0) {
                const { award } = await getCheckinInfo(selectedGameName, ltoken_v2, ltuid_v2);

                checkinEmbed = new EmbedBuilder()
                    .setColor('#6395EE')
                    .setTitle('Daily Check-in Reward Claimed')
                    .setAuthor({ name: `${username} (${uid})`, iconURL: await getGameUrl(selectedGameName).logo })
                    .setDescription(`${award.name} x${award.cnt}`)
                    .setThumbnail(award.icon);
            } else {
                checkinEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Daily Check-in Failed')
                    .setAuthor({ name: `${username} (${uid})`, iconURL: await getGameUrl(selectedGameName).logo })
                    .setDescription(message);
            }

            if (isFirstGame) {
                await interaction.editReply({ embeds: [checkinEmbed] });
                isFirstGame = false;
            } else {
                if (interaction.inCachedGuild()) {
                    await interaction.channel.send({ embeds: [checkinEmbed] });
                } else {
                    await interaction.client.users.send(interaction.user.id, { embeds: [checkinEmbed] });
                }
            }
        }
    }
}

/**
 * Search for users that have auto check-in enabled and claim the reward
 * @param {*} client - Discord client
 * @param {*} dbClient - MongoDB client
 */
async function databaseCheckin(client, dbClient) {
    const database = dbClient.db('users');
    const collection = database.collection('discord-data');
    
    const query = {};
    const users = await collection.find(query).toArray();

    for (const user of users) {
        const { discordID } = user;
        const { ltoken_v2, ltuid_v2 } = user.hoyoverse.hoyolab;
        for (const key in user.hoyoverse) {
            if (key !== 'hoyolab' && user.hoyoverse[key].auto_checkin) {
                const gameNames = {
                    hi3: 'Honkai Impact 3rd',
                    gi: 'Genshin Impact',
                    hsr: 'Honkai: Star Rail',
                    zzz: 'Zenless Zone Zero'
                };

                const selectedGameName = gameNames[key];
                const { retcode, message } = await hoyolabCheckin(selectedGameName, ltoken_v2, ltuid_v2);
                
                if (retcode === 0) {
                    const database = await getSpecificProjection(dbClient, user.discordID, key);
                    const { username, uid } = database.hoyoverse[key];
                    const { award } = await getCheckinInfo(selectedGameName, ltoken_v2, ltuid_v2);

                    const checkinEmbed = new EmbedBuilder()
                        .setColor('#6395EE')
                        .setTitle('Daily Check-in Reward Claimed')
                        .setAuthor({ name: `${username} (${uid})`, iconURL: await getGameUrl(selectedGameName).logo })
                        .setDescription(`${award.name} x${award.cnt}`)
                        .setThumbnail(award.icon);

                    if (await getUserNotifPreference(dbClient, discordID)) {
                        await client.users.send(discordID, { embeds: [checkinEmbed] });
                    }
                } else {
                    const checkinEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Daily Check-in Failed')
                        .setAuthor({ name: selectedGameName, iconURL: await getGameUrl(selectedGameName).logo })
                        .setDescription(message);
                    
                    await client.users.send(discordID, { embeds: [checkinEmbed] });
                }
            }
        }
    }
}

/**
 * Send a request to HoYoLAB to get the game data
 * @param {*} dbClient - MongoDB client
 * @param {string} discordID - Discord ID
 * @returns The game data from HoYoLAB
 */
async function getGameViaHoyolab(dbClient, discordID) {
    const user = await getUserData(dbClient, discordID);
    const ltoken_v2 = user.hoyoverse.hoyolab.ltoken_v2;
    const ltuid_v2 = user.hoyoverse.hoyolab.ltuid_v2;

    const headers = {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
        Connection: 'keep-alive',
        Cookie: `ltoken_v2=${ltoken_v2}; ltuid_v2=${ltuid_v2};`,
        Origin: 'https://act.hoyolab.com',
        Referer: 'https://act.hoyolab.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
        'x-rpc-lang': 'en-us',
        'x-rpc-language': 'en-us'
    };

    const data = await axios.get(`https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=${ltuid_v2}`, {headers});
    return data.data;
}

async function getProfileViaHoyolab(dbClient, discordID) {
    const user = await getUserData(dbClient, discordID);
    const ltoken_v2 = user.hoyoverse.hoyolab.ltoken_v2;
    const ltuid_v2 = user.hoyoverse.hoyolab.ltuid_v2;

    const headers = {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
        Connection: 'keep-alive',
        Cookie: `account_id_v2=${ltuid_v2}; ltoken_v2=${ltoken_v2}; ltuid_v2=${ltuid_v2};`,
        Host: 'bbs-api-os.hoyolab.com',
        Origin: 'https://act.hoyolab.com',
        Referer: 'https://act.hoyolab.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
        'x-rpc-lang': 'en-us',
        'x-rpc-language': 'en-us'
    };

    const data = await axios.get(`https://bbs-api-os.hoyolab.com/community/painter/wapi/user/full?scene=1&uid=${ltuid_v2}`, {headers});
    return data.data;
}

/**
 * Checkin the user in the database after a random delay
 * @param {*} client - Discord client
 * @param {*} dbClient - MongoDB client
 */
async function dailyCheckin(client, dbClient) {
    const randomDelay = Math.floor(Math.random() * 56) * 60 * 1000;
			
    setTimeout(async () => {
        try {
            await databaseCheckin(client, dbClient);
            console.log(`\x1b[32m[HoYoLAB]\x1b[0m Check-in successful for all users`);
        } catch (error) {
            console.error(`\x1b[31m[ERROR]\x1b[0m ${error} trying to complete checkin`);
        }
    }, randomDelay);
}

module.exports = { hoyolabCheckin, checkinEveryGame, databaseCheckin, getCheckinInfo, getGameViaHoyolab, getProfileViaHoyolab, dailyCheckin };