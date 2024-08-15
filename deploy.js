const { REST, Routes } = require('discord.js');
const config = require('./config');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// Grab all the command files from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'HoYoVista', 'commands');
const commandFolders = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFolders) {
    const filePath = path.join(foldersPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
		const commandData = command.data.toJSON();
		const extras = {
			"integration_types": [0, 1], //0 for guild, 1 for user
			"contexts": [0, 1, 2], //0 for guild, 1 for app DMs, 2 for GDMs and other DMs
		};
		Object.assign(commandData, extras);
		commands.push(commandData);
		console.log(`\x1b[32m[Slash Command]\x1b[0m Loaded ${command.data.name}`);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.token);

// and deploy your commands!
(async () => {
	try {
		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands(config.clientId),
			{ body: commands },
		);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();