const { MongoClient, ServerApiVersion } = require('mongodb');
const { getAvailableCodes } = require('../getAvailableCodes');
const config = require('../../../config');

/**
 * Class to interact with MongoDB
 */
class MongoDB {
    client;
    #targetID;

    constructor(client, targetID) {
        this.client = client;
        this.#targetID = targetID;
    }

    /**
     * Delete the user from the database
     */
    async deleteUser() {
        try {
            const database = this.client.db('users');
            const collection = database.collection('hoyoverse');
            await collection.deleteOne({ id: this.#targetID });
        } catch (error) {
            throw new Error('Failed to delete user');
        }
    }

    /**
     * Delete a game from the user's linked games list
     * @param {string} gameName - Name of the game to delete
     */
    async deleteGame(gameName) {
        try {
            const database = this.client.db('users');
            const collection = database.collection('hoyoverse');
            await collection.updateOne({ id: this.#targetID }, {
                $unset: { [`linkedGamesList.${gameName}`]: '' }
            });
        } catch (error) {
            throw new Error('Failed to delete game');
        }
    }

    /**
     * Register a user in the database with their HoYoLAB credentials
     * @param {string} ltoken_v2 - HoYoLAB ltoken_v2
     * @param {string} ltuid_v2 - HoYoLAB ltuid_v2
     */
    async registerUser(stoken, ltoken_v2, ltuid_v2, ltmid_v2) {
        try {
            const database = this.client.db('users');
            const collection = database.collection('hoyoverse');

            await collection.insertOne({
                id: this.#targetID,
                joinedAt: Date.now(),
                settings: {
                    darkMode: true,
                    isPrivate: false,
                    checkinNotif: true
                },
                hoyolab: {
                    stoken: stoken,
                    ltmid_v2: ltmid_v2,
                    ltoken_v2: ltoken_v2,
                    ltuid_v2: ltuid_v2,
                    cookie_token_v2: null
                }
            });
        } catch (error) {
            throw new Error('Failed to register user');
        }
    }

    /**
     * Update a user with their game profiles from HoYoLAB
     * @param {*} gameProfiles - The user's game profiles
     */
    async updateUserWithGameProfiles(gameProfiles) {
        try {
            const database = this.client.db('users');
            const collection = database.collection('hoyoverse');

            await collection.updateOne({ id: this.#targetID }, {
                $set: {
                    "linkedGamesList": gameProfiles
                }
            });
        } catch (error) {
            throw new Error('Failed to update user with game profiles');
        }
    }

    /**
     * Check if a game is linked to the user's HoYoLAB account
     * @param {string} gameName - Name of the game to check
     * @returns {boolean} Whether the game is linked to the user's HoYoLAB account
     */
    async isGameLinked(gameName) {
        try {
            const database = this.client.db('users');
            const collection = database.collection('hoyoverse');
            const user = await collection.findOne({ id: this.#targetID });

            if (user && user.linkedGamesList && user.linkedGamesList.hasOwnProperty(gameName)) {
                return true;
            }
            return false;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get the user's data from the database
     * @returns {Promise<Object>} The user's data
     */
    async getUserData() {
        try {
            const database = this.client.db('users');
            const collection = database.collection('hoyoverse');
            const user = await collection.findOne({ id: this.#targetID });
            return user;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Generic function to get a user preference
     * @param {string} preferencePath - Path to the preference in the user document
     * @returns {*} The value of the preference
     */
    async getUserPreference(preferencePath) {
        const database = this.client.db('users');
        const collection = database.collection('hoyoverse');
        const projection = { [preferencePath]: 1, _id: 0 };
        const user = await collection.findOne({ id: this.#targetID }, { projection });

        return preferencePath.split('.').reduce((obj, key) => obj && obj[key], user);
    }

    /**
     * Generic function to set a user preference
     * @param {string} preferencePath - Path to the preference in the user document
     * @param {*} value - New value of the preference
     */
    async setUserPreference(preferencePath, value) {
        const database = this.client.db('users');
        const collection = database.collection('hoyoverse');
        await collection.updateOne(
            { id: this.#targetID },
            { $set: { [preferencePath]: value } }
        );
    }

    /**
     * Get all users with auto check-in enabled
     * @returns {Promise<Object[]>} Users with auto check-in enabled
     */
    async getUsersWithAutoCheckin() {
        const database = this.client.db('users');
        const collection = database.collection('hoyoverse');

        return await collection.find({
            $or: [
                { "linkedGamesList.genshin.auto_checkin": true },
                { "linkedGamesList.honkai3rd.auto_checkin": true },
                { "linkedGamesList.hkrpg.auto_checkin": true },
                { "linkedGamesList.zzz.auto_checkin": true },
            ]
        }).toArray();
    }

    static async setCurrentCodes(dbClient, id) {
        const newCodes = await getAvailableCodes();

        const database = dbClient.db('users');
        const collection = database.collection('hoyoverse');
        const users = await collection.find().toArray();

        await Promise.all(users.map(async (user) => {
            if (user.id === id) {
                for (const [game, codes] of Object.entries(newCodes)) {
                    const updateField = `linkedGamesList.${game}.codes`;

                    if (game === 'honkai3rd' && user.linkedGamesList[game]) {
                        for (const code of codes) {
                            await collection.updateOne(
                                { id: user.id },
                                { $push: { [updateField]: code } }
                            );
                        }
                    }
                }
            }
        }));
    }

    /**
     * Connect to MongoDB
     * @returns {Promise<Object>} The mongo client
     */
    static async connect() {
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
     * Delete a user from the database
     * @param {*} client - MongoDB client
     * @param {string} targetID - ID of the user to delete
     */
    static async deleteUser(client, targetID) {
        try {
            const database = client.db('users');
            const collection = database.collection('hoyoverse');
            await collection.deleteOne({ id: targetID });
        } catch (error) {
            throw new Error('Failed to delete user');
        }
    }

    /**
     * Delete a game from the user's linked games list
     * @param {*} client - MongoDB client
     * @param {string} targetID - ID of the user to delete
     * @param {string} gameName - Name of the game to delete
     */
    static async deleteGame(client, targetID, gameName) {
        try {
            const database = client.db('users');
            const collection = database.collection('hoyoverse');
            await collection.updateOne({ id: targetID }, {
                $unset: { [`linkedGamesList.${gameName}`]: '' }
            });
        } catch (error) {
            throw new Error('Failed to delete game');
        }
    }

    /**
     * Get a user's linked games list
     * @param {*} client - MongoDB client
     * @param {string} targetID - ID of the user to check
     * @returns {Promise<Object>} The user's linked games list
     */
    static async getUserGameProfiles(client, targetID) {
        try {
            const database = client.db('users');
            const collection = database.collection('hoyoverse');
            const user = await collection.findOne({ id: targetID });
            return user.linkedGamesList;
        } catch (error) {
            throw error;
        }
    }

    /**
     * 
     * @param {*} client - MongoDB client
     * @returns {Promise<Object[]>} Users with auto check-in enabled
     */
    static async getUsersWithAutoCheckin(client) {
        const database = client.db('users');
        const collection = database.collection('hoyoverse');

        return await collection.find({
            $or: [
                { "linkedGamesList.genshin.auto_checkin": true },
                { "linkedGamesList.honkai3rd.auto_checkin": true },
                { "linkedGamesList.hkrpg.auto_checkin": true },
                { "linkedGamesList.zzz.auto_checkin": true },
            ]
        }).toArray();
    }

    static async getUsersWithAutoRedeem(client) {
        const database = client.db('users');
        const collection = database.collection('hoyoverse');

        return await collection.find({
            $or: [
                { "linkedGamesList.genshin.auto_redeem": true },
                { "linkedGamesList.honkai3rd.auto_redeem": true },
                { "linkedGamesList.hkrpg.auto_redeem": true },
                { "linkedGamesList.zzz.auto_redeem": true },
            ]
        }).toArray();
    }

    /**
     * Get a user's data from the database
     * @param {*} client - MongoDB client
     * @param {string} target - ID of the user to check
     * @param {string} preferencePath - Path to the preference in the user document
     * @returns {*} The value of the preference
     */
    static async getUserPreference(client, target, preferencePath) {
        const database = client.db('users');
        const collection = database.collection('hoyoverse');
        const projection = { [preferencePath]: 1, _id: 0 };
        const user = await collection.findOne({ id: target }, { projection });

        return preferencePath.split('.').reduce((obj, key) => obj && obj[key], user);
    }

    static async getCachedCodes(client) {
        const database = client.db('users');
        const collection = database.collection('data');
        const documents = await collection.find();
        const codes = [];

        documents.forEach(doc => {
            if (doc.codes) {
                codes.push(doc.code);
            }
        });

        return codes;
    }

    static async updateUserCodes(client, target, game, code) {
        const database = client.db('users');
        const collection = database.collection('hoyoverse');

        const updateField = `linkedGamesList.${game}.codes`;
        await collection.updateOne(
            { id: target },
            { $push: { [updateField]: code } }
        );
    }

    static async syncCodes(dbClient, allcodes) {
        const database = dbClient.db('users');
        const collection = database.collection('hoyoverse');
        const users = await collection.find().toArray();

        await Promise.all(users.map(async (user) => {
            for (const [game, codes] of Object.entries(allcodes)) {
                const updateField = `linkedGamesList.${game}.codes`;

                if (user.linkedGamesList[game]) {
                    const existingCodes = user.linkedGamesList[game].codes || [];
                    const matchingCodes = existingCodes.filter(code => codes.includes(code));

                    await collection.updateOne(
                        { id: user.id },
                        { $set: { [updateField]: matchingCodes } }
                    );
                }
            }
        }));
    }

    static async updateCodeDatabase(dbClient, newCodes) {
        const database = dbClient.db('users');
        const collection = database.collection('data');
        const document = await collection.findOne();

        if (document) {
            const updatedCodes = { ...document.code };

            for (const game in newCodes) {
                if (newCodes.hasOwnProperty(game)) {
                    updatedCodes[game] = [...(updatedCodes[game] || []), ...newCodes[game]];
                }
            }

            await collection.updateOne(
                { _id: document._id },
                { $set: { code: updatedCodes } }
            );
        } else {
            await collection.insertOne({ code: newCodes });
        }
    }
}

module.exports = { MongoDB };