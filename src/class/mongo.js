import { MongoClient, ServerApiVersion } from "mongodb";
import { config } from "../../config.js";
import logger from "../utils/logger.js";

export class MongoDB {
    static #instance;
    #mongoClient;
    #collection;

    constructor() {
        if (MongoDB.#instance) return MongoDB.#instance;

        MongoDB.#instance = this;
    }

    /**
     * Establishes a connection to the MongoDB database
     */
    async connect() {
        if (this.#mongoClient) return this;

        const client = new MongoClient(config.mongoUri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
            maxPoolSize: 10,
            minPoolSize: 2,
        });

        try {
            await client.connect();
            logger.info("MongoDB: Connected successfully!");

            const database = client.db("hoyovista");
            const collection = database.collection("users");

            await collection.createIndex({ discord_id: 1 }, { unique: true });

            this.#mongoClient = client;
            this.#collection = collection;

            return this;
        } catch (error) {
            throw new Error(error);
        }
    }

    async #attemptReconnection(retries = 5, delay = 2000) {
        while (retries > 0) {
            try {
                logger.info("MongoDB: Attempting to reconnect...");
                await this.#mongoClient.connect();
                logger.info("MongoDB: Reconnected successfully!");
                return;
            } catch (error) {
                retries--;
                if (retries === 0) {
                    logger.error("MongoDB: Reconnection failed:", { stack: error.stack });
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Closes the connection to the MongoDB database
     */
    async disconnect() {
        if (this.#mongoClient) {
            await this.#mongoClient.close();
        }
    }

    /**
     * Retrieves user data from the database
     * @param {string} targetId - The Discord ID of the user to retrieve data for
     * @returns {Promise<Object>} The result of the retrieval
     */
    async getUserData(targetId) {
        try {
            if (!this.#mongoClient) await this.#attemptReconnection();

            const user = await this.#collection.findOne({ discord_id: targetId });
            if (!user) return { retcode: -1, message: "User not found" };

            return { retcode: 1, data: user };
        } catch (error) {
            return { retcode: -1, message: error.message };
        }
    }

    async getUserField(id, { fields }) {
        try {
            if (!this.#mongoClient) await this.#attemptReconnection();

            const projection = Array.isArray(fields)
                ? fields.reduce((acc, field) => ({ ...acc, [field]: 1 }), { _id: 0 })
                : { [fields]: 1, _id: 0 };

            const user = await this.#collection.findOne({ discord_id: id }, { projection });
            if (!user) return { retcode: -1, message: "User not found" };

            return { retcode: 1, data: user };
        } catch (error) {
            return { retcode: -1, message: error.message };
        }
    }

    /**
     * Register a user into the database
     * @param {string} id - Discord id
     */
    async initUser(id) {
        try {
            const userData = {
                discord_id: id,
                joined_at: Math.floor(Date.now() / 1000),
                settings: {
                    subscribed: true,
                    collect_data: true,
                    is_private: false,
                },
                stats: {
                    command_used: 1,
                },
            };

            await this.#collection.insertOne(userData);
            return { retcode: 1, message: "Success" };
        } catch (error) {
            return { retcode: -1, message: error.message };
        }
    }

    async set(id, { field, value }) {
        try {
            await this.#collection.updateOne(
                { discord_id: id },
                {
                    $set: {
                        [field]: value,
                    },
                }
            );

            return { retcode: 1 };
        } catch (error) {
            return { retcode: -1, message: error.message };
        }
    }

    async increment(id, { field, value }) {
        try {
            await this.#collection.updateOne(
                { discord_id: id },
                {
                    $inc: {
                        [field]: value,
                    },
                }
            );

            return { retcode: 1 };
        } catch (error) {
            return { retcode: -1, message: error.message };
        }
    }

    async push(id, { field, value }) {
        try {
            await this.#collection.updateOne(
                { discord_id: id },
                {
                    $push: {
                        [field]: value,
                    },
                }
            );

            return { retcode: 1 };
        } catch (error) {
            return { retcode: -1, message: error.message };
        }
    }

    async find(query = {}) {
        try {
            const results = await this.#collection.find(query).toArray();
            return { retcode: 1, data: results };
        } catch (error) {
            return { retcode: -1, message: error.message };
        }
    }

    /**
     * Returns the singleton instance of the MongoDB class
     * @returns {MongoDB} - The singleton instance of the MongoDB class
     */
    static getInstance() {
        if (!MongoDB.#instance) {
            MongoDB.#instance = new MongoDB();
        }
        return MongoDB.#instance;
    }
}
