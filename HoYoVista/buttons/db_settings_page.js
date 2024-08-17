const settings = require('../commands/settings');

module.exports = {
    data: {
        id: 'db_settings_page',
        description: 'Navigate between settings pages',
    },
    async execute(interaction, dbClient, buttonId) {
        try {
            const [, , , type, pageStr] = buttonId.split('_');
            let page = parseInt(pageStr);

            if (type === 'prev') page--;
            if (type === 'next') page++;

            await settings.execute(interaction, dbClient, true, page);
        } catch (error) {
            throw error;
        }
    },
};