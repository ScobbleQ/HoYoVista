const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { MongoDB } = require('./HoYoVista/utils/class/mongo');
const config = require('./config');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds
	]
});

client.cooldowns = new Collection();
client.commands = new Collection();

async function initializeDiscordBot() {
	try {
		const dbClient = await MongoDB.connect();

		const foldersPath = path.join(__dirname, 'HoYoVista', 'commands');
		const commandFolders = fs.readdirSync(foldersPath);

		for (const file of commandFolders) {
			const filePath = path.join(foldersPath, file);
			const command = require(filePath);
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}

		const eventsPath = path.join(__dirname, 'HoYoVista', 'events');
		const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

		for (const file of eventFiles) {
			const filePath = path.join(eventsPath, file);
			const event = require(filePath);
			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args, dbClient));
			} else {
				client.on(event.name, (...args) => event.execute(...args, dbClient));
			}
			console.log(`\x1b[32m[Event]\x1b[0m Loaded ${event.name}`);
		}

		client.login(config.token);
	} catch (error) {
		console.error(`\x1b[31m[ERROR]\x1b[0m ${error} while initializing bot`);
	}
};

initializeDiscordBot();