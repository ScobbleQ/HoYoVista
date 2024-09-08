const { EmbedBuilder } = require('discord.js');
const { HoYoLAB } = require('../class/hoyolab');
const { MongoDB } = require('../class/mongo');
const { embedColors } = require('../../config');

module.exports = {
	data: {
		id: 'hyl_add_acc_cookies_modal',
		description: 'Add HoYoLAB Account (Auto)',
	},
	async execute(interaction, dbClient) {
		let mongo;
		let registrationSuccess = false;

		try {
			const cookies = interaction.fields.getTextInputValue('hyl_acc_cookies');
			mongo = new MongoDB(dbClient, interaction.user.id);

			await interaction.update({
				embeds: [new EmbedBuilder()
					.setColor(embedColors.warning)
					.setDescription('Hang on while we process the information'),
				],
				components: [],
			});

			if (await mongo.getUserData()) {
				mongo.deleteUser();
			}

			const { ltoken_v2, ltuid_v2, ltmid_v2, stoken } = await HoYoLAB.parseCookies(cookies);

			await mongo.registerUser(stoken, ltoken_v2, ltuid_v2, ltmid_v2);

			const hoyolab = new HoYoLAB(ltoken_v2, ltuid_v2, ltmid_v2, stoken);
			const data = await hoyolab.initBasicGameData();

			if (data.retcode !== 0) {
				await interaction.deleteReply();
				await mongo.deleteUser();
				return await interaction.followUp({
					embeds: [new EmbedBuilder()
						.setColor(embedColors.error)
						.setDescription('Failed to fetch account data. Please try again.'),
					],
					ephemeral: true,
				});
			}

			await mongo.updateUserWithGameProfiles(hoyolab.basicGameData);
			await HoYoLAB.updateCookieToken(dbClient, interaction.user.id);
			await MongoDB.setCurrentCodes(dbClient, interaction.user.id);

			registrationSuccess = true;

			await interaction.deleteReply();
			await interaction.followUp({
				embeds: [new EmbedBuilder()
					.setColor(embedColors.success)
					.setTitle('Account Successfully Registered')
					.setDescription('Welcome aboard!\nTo view and manage your account, use `/account`.\nAuto check-in and code redemption are enabled by default.\n\nIf you need to change any settings, use `/settings`.'),
				],
				ephemeral: true,
			});
		}
		catch (error) {
			throw error;
		}
		finally {
			if (!registrationSuccess && mongo) {
				await mongo.deleteUser();
			}
		}
	},
};