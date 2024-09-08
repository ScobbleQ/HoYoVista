module.exports = {
	data: {
		id: 'delete_button',
		description: 'Deletes the message attached to the button',
	},
	async execute(interaction) {
		await interaction.message.delete();
	},
};