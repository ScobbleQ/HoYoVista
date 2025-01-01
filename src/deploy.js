import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REST, Routes } from 'discord.js';
import { config } from '../config.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'));

async function loadCommands() {
	for (const file of commandFolders) {
		const filePath = path.join(foldersPath, file);
		const command = await import(filePath);
		const cmd = command.default;

		if (cmd && 'data' in cmd && 'execute' in cmd) {
			commands.push(cmd.data.toJSON());
			logger.info(`Loaded slash command: ${cmd.data.name}`);
		}
		else {
			logger.warn(`[WARNING] Command at ${filePath} is missing required "data" or "execute" property.`);
		}
	}
}

(async () => {
	await loadCommands();

	const rest = new REST().setToken(config.token);

	try {
		logger.info(`Started refreshing ${commands.length} application (/) commands.`);
		const data = await rest.put(
			Routes.applicationCommands(config.clientId),
			{ body: commands },
		);
		logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
	}
	catch (error) {
		logger.error('Failed to reload commands:', { stack: error.stack });
	}
})();