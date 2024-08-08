const { MongoClient, ServerApiVersion } = require('mongodb');
const axios = require('axios');
const config = require('../../config');

/**
 * Connects to the MongoDB database
 * @returns {Promise<MongoClient>}
 */
async function connectToDatabase() {
    const client = new MongoClient(config.mongoUri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true
        }
    });

    try {
        await client.connect();
        console.log('\x1b[35m[MongoDB]\x1b[0m Connection established');
        return client;
    } catch (error) {
        console.error(`\x1b[31m[ERROR]\x1b[0m ${error}`);
    }
}

/**
 * Checks if the user exists in the database
 * @param {*} client - MongoDB client
 * @param {string} discordID - Discord ID
 * @returns True if the user exists, false otherwise
 */
async function checkIfUserExists(client, discordID) {
    try {
        const database = client.db('users');
        const collection = database.collection('discord-data');
        const user = await collection.findOne({ discordID: discordID });

        if (user) {
            return true;
        }
        return false;
    } catch (error) {
        console.error(`\x1b[31m[ERROR]\x1b[0m ${error}`);
    }
}

/**
 * Searches for the user data in the database
 * @param {*} client - MongoDB client
 * @param {string} discordID - Discord ID
 * @returns The user data
 */
async function getUserData(client, discordID) {
    const database = client.db('users');
    const collection = database.collection('discord-data');
    const user = await collection.findOne({ discordID: discordID });
    return user;
}

/**
 * Gets the user's display preference
 * @param {*} client - MongoDB client
 * @param {string} discordID - Discord ID
 * @returns True if the user has dark mode enabled, false otherwise
 */
async function getUserDisplayPreference(client, discordID) {
    const database = client.db('users');
    const collection = database.collection('discord-data');
    const user = await collection.findOne({ discordID: discordID }, { projection: { 'hoyoverse.hoyolab.darkMode': 1, _id: 0 } });

    return user.hoyoverse.hoyolab.darkMode;
}

/**
 * Updates the user's display preference
 * @param {*} client - MongoDB client
 * @param {string} discordID - Discord ID
 * @param {boolean} darkMode - New dark mode setting
 */
async function setUserDisplayPreference(client, discordID, darkMode) {
    const database = client.db('users');
    const collection = database.collection('discord-data');
    await collection.updateOne(
        { discordID: discordID },
        { $set: { 'hoyoverse.hoyolab.darkMode': darkMode } }
    );
}

/**
 * Gets the user's privacy preference
 * @param {*} client - MongoDB client
 * @param {string} discordID - Discord ID
 * @returns True if the user has private mode enabled, false otherwise
 */
async function getUserPrivacyPreference(client, discordID) {
    const database = client.db('users');
    const collection = database.collection('discord-data');
    const user = await collection.findOne({ discordID: discordID }, { projection: { 'hoyoverse.hoyolab.isPrivate': 1, _id: 0 } });

    return user.hoyoverse.hoyolab.isPrivate;
}

/**
 * Updates the user's privacy preference
 * @param {*} client - MongoDB client
 * @param {string} discordID - Discord ID
 * @param {boolean} isPrivate - New privacy setting
 */
async function setUserPrivacyPreference(client, discordID, isPrivate) {
    const database = client.db('users');
    const collection = database.collection('discord-data');
    await collection.updateOne(
        { discordID: discordID },
        { $set: { 'hoyoverse.hoyolab.isPrivate': isPrivate } }
    );
}

async function getUserNotifPreference(client, discordID) {
    const database = client.db('users');
    const collection = database.collection('discord-data');
    const user = await collection.findOne({ discordID: discordID }, { projection: { 'hoyoverse.hoyolab.checkinNotif': 1, _id: 0 } });
    
    return user.hoyoverse.hoyolab.checkinNotif;
}

async function setUserNotifPreference(client, discordID, checkinNotif) {
    const database = client.db('users');
    const collection = database.collection('discord-data');
    await collection.updateOne(
        { discordId: discordID },
        { $set: { 'hoyoverse.hoyolab.checkinNotif': checkinNotif } }
    );
}

/**
 * Adds the user to the database
 * @param {*} client - MongoDB client
 * @param {string} discordID - Discord ID
 * @param {string} ltoken_v2 - The ltoken_v2 cookie
 * @param {string} ltuid_v2 - The ltuid_v2 cookie
 */
async function addUserToDatabase(client, discordID, ltoken_v2, ltuid_v2) {
    if (ltoken_v2 === null || ltuid_v2 === null) {
        return { status: 'Fail', message: 'Invalid cookies' };
    }

    try {
        const headers = {
            Accept: 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            Connection: 'keep-alive',
            Cookie: `ltoken_v2=${ltoken_v2}; ltuid_v2=${ltuid_v2};`,
            Origin: 'https://act.hoyolab.com',
            Referer: 'https://act.hoyolab.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
        };

        const hoyolab = await axios.get(`https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=${ltuid_v2}`, { headers });
        const hoyolabInfo = hoyolab.data;

        const database = client.db('users');
        const collection = database.collection('discord-data');

        const newUser = {
            discordID: discordID,
            hoyoverse: {
                hoyolab: {
                    ltoken_v2: ltoken_v2,
                    ltuid_v2: ltuid_v2,
                    darkMode: true,
                    isPrivate: false,
                    checkinNotif: true,
                }
            }
        };

        const gameNameEN = {
            'Genshin Impact': 'gi',
            'Honkai Impact 3rd': 'hi3',
            'Honkai: Star Rail': 'hsr',
            'Zenless Zone Zero': 'zzz'
        };

        hoyolabInfo.data.list.forEach(game => {
            newUser.hoyoverse[gameNameEN[game.game_name]] = {
                username: game.nickname,
                uid: game.game_role_id,
                auto_checkin: true
            };
        });

        await collection.insertOne(newUser);
        return { status: 'Success', message: 'User added to database' };
    } catch (error) {
        console.error(`\x1b[31m[ERROR]\x1b[0m ${error}`);
    }
}

/**
 * Searches for a specific projection in the database
 * @param {*} client - MongoDB client
 * @param {string} discordID - Discord ID
 * @param {string} field - Field to get
 * @returns The specific projection
 */
async function getSpecificProjection(client, discordID, field) {
    const database = client.db('users');
    const collection = database.collection('discord-data');
    const projection = { [`hoyoverse.${field}`]: 1, _id: 0 };
    const user = await collection.findOne({ discordID: discordID }, { projection });
    return user;
}

async function removeAccount(interaction, dbClient, discordId, uid) {
    const db = dbClient.db('users');
    const collection = db.collection('discord-data');
    const userData = await collection.findOne({ discordID: discordId });

    if (!userData) { return; }

    if (uid === 'all') {
        await collection.deleteOne({ discordID: discordId });
        await interaction.reply({ content: 'Your account has been successfully unlinked.', ephemeral: true });
    } else {
        const { hoyoverse } = userData;
        const games = {
            'gi': 'Genshin Impact',
            'hi3': 'Honkai Impact 3rd',
            'hsr': 'Honkai: Star Rail',
            'zzz': 'Zenless Zone Zero'
        };

        let gameRemoved = false;
        for (const [gameCode, gameName] of Object.entries(games)) {
            if (hoyoverse[gameCode] && hoyoverse[gameCode].uid === uid) {
                delete hoyoverse[gameCode];
                gameRemoved = true;
                await interaction.reply({ content: `${gameName} account with uid \`${uid}\` has been removed. Use \`/account\` again to see updated list.`, ephemeral: true });
            }
        };

        if (gameRemoved) {
            const remainingGames = Object.keys(games).filter(gameCode => hoyoverse[gameCode]);

            if (remainingGames.length === 0) {
                await collection.deleteOne({ discordID: discordId });
                await interaction.followUp({ content: 'HoYoLAB data has been removed as there are no linked accounts. To relink, use \`/account\`.', ephemeral: true });
            } else {
                await collection.updateOne({ discordID: discordId }, { $set: { hoyoverse } });
            }
        }
    }
}

module.exports = { 
    connectToDatabase, 
    checkIfUserExists, 
    getUserDisplayPreference, getUserPrivacyPreference, getUserNotifPreference,
    setUserDisplayPreference, setUserPrivacyPreference, setUserNotifPreference,
    addUserToDatabase, getUserData, getSpecificProjection, removeAccount 
};
