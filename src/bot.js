import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { config } from '../config.js';
import { MongoDB } from './class/mongo.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.cooldowns = new Collection();
client.commands = new Collection();

async function initializeDiscordBot() {
    try {
        const foldersPath = join(__dirname, 'commands');
        const commandFolders = readdirSync(foldersPath);

        for (const file of commandFolders) {
            const filePath = join(foldersPath, file);
            const command = await import(filePath);
            if ('data' in command.default && 'execute' in command.default) {
                client.commands.set(command.default.data.name, command.default);
            } else {
                logger.warn(`Discord: Command at ${filePath} missing "data" or "execute"`);
            }
        }

        const eventsPath = join(__dirname, 'events');
        const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = join(eventsPath, file);
            const event = await import(filePath);
            if (event.default.once) {
                client.once(event.default.name, (...args) => event.default.execute(...args));
            } else {
                client.on(event.default.name, (...args) => event.default.execute(...args));
            }
        }

        await client.login(config.token);
        logger.info(`Discord: Logged in as ${client.user.tag}`);
    } catch (error) {
        logger.error('Discord: Error initializing bot:', { stack: error.stack });
    }
}

process.on('SIGINT', async () => {
    logger.info('Node: Shutting down...');
    await MongoDB.getInstance().disconnect();
    await client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Node: Unhandled promise rejection:', { stack: error.stack });
});

initializeDiscordBot();
