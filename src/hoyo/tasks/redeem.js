import { ContainerBuilder, DiscordAPIError, MessageFlags } from 'discord.js';
import pLimit from 'p-limit';
import {
  addAttemptedCode,
  addEvent,
  getCookies,
  getUserLinkedGames,
  getUsersWithAutoRedeem,
  updateUser,
} from '../../db/queries.js';
import { IdToAbbr, IdToFull } from '../../hoyo/utils/constants.js';
import logger from '../../utils/logger.js';
import { censorUid } from '../../utils/privacy.js';
import { redeemCode } from '../api/redeem.js';
import { cleanAttemptedCodes } from '../utils/cleanAttemptedCodes.js';
import { Games } from '../utils/constants.js';
import { delayMs } from '../utils/delay.js';
import { fetchSeriaCodes } from '../utils/fetchSeriaCodes.js';

/** @typedef {import("../../utils/typedef.js").GameID} GameID */

/**
 *
 * @param {import("discord.js").Client} client
 */
export async function autoRedeem(client) {
  // Random delay between 0 and 25 minutes
  const delay = Math.floor(Math.random() * 26) * 60 * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const availableCodes = await fetchSeriaCodes();
  if (!availableCodes) return;

  const users = await getUsersWithAutoRedeem();
  const limit = pLimit(10);

  logger.info(`[Cron:ARedeem] Starting redeem for ${users.length} users`);
  const task = users.map((u) =>
    limit(async () => {
      try {
        const [cookies, linkedGames] = await Promise.all([
          getCookies(u.uid),
          getUserLinkedGames(u.uid),
        ]);

        // If no cookies or linked games, skip
        if (!cookies || linkedGames.length === 0) return;

        let didAttemptRedeem = false;
        let hasAddedSection = false;

        const redeemContainer = new ContainerBuilder()
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `## Code Redemption Summary\n-# <t:${Math.floor(Date.now() / 1000)}:F>`
            )
          )
          .addSeparatorComponents((separator) => separator);

        // Loop through all linked games
        for (let i = 0; i < linkedGames.length; i++) {
          const game = linkedGames[i];

          // Automatic redeem is disabled, skip
          if (!game.autoRedeem) continue;

          // Get redeemed codes for this game
          const redeemedCodes = game.attemptedCodes;

          // Get unredeemed codes for this game
          const unredeemedCodes =
            availableCodes[IdToAbbr[game.gameId]]?.filter(
              (code) => !redeemedCodes.includes(code.code)
            ) || [];

          // If no unredeemed codes, skip
          if (unredeemedCodes.length === 0) continue;
          didAttemptRedeem = true;

          // Separator only before 2nd, 3rd, … section (so we never add a trailing one)
          if (hasAddedSection) {
            redeemContainer.addSeparatorComponents((separator) => separator);
          }

          // Loop through all unredeemed codes
          let gameSectionText = `**${IdToFull[game.gameId]}** (${censorUid({ uid: game.gameRoleId, flag: u.private })})\n`;

          // Special case for Honkai Impact 3rd
          if (game.gameId === Games.HONKAI) {
            gameSectionText += '-# Please redeem these codes manually in-game:\n';
            gameSectionText += unredeemedCodes
              .map((c) =>
                `- Code: \`${c.code}\`${c.rewards ? `\n> Reward: ${c.rewards}` : ''}`.trim()
              )
              .join('\n');

            redeemContainer.addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(gameSectionText)
            );
            hasAddedSection = true;

            for (const codes of unredeemedCodes) {
              // Add the code to the attempted codes list
              await addAttemptedCode(u.uid, game.gameId, codes.code);
            }

            continue;
          }

          for (let j = 0; j < unredeemedCodes.length; j++) {
            const code = unredeemedCodes[j];

            // Add the code to the attempted codes list
            await addAttemptedCode(u.uid, game.gameId, code.code);

            // Redeem the code
            const redeem = await redeemCode(game.gameRoleId, {
              gameId: /** @type {GameID} */ (game.gameId),
              region: game.region,
              code: code.code,
              cookies: cookies,
            });

            if (!redeem || !redeem.data) {
              if (u.collectData) {
                await addEvent(u.uid, {
                  game: game.gameId,
                  type: 'redeem',
                  metadata: {
                    code: code.code,
                    reward: null,
                  },
                });
              }
            }

            // Add the code to the text
            gameSectionText += `- Code: \`${code.code}\`\n> `;

            // Code redemption failed, add error message
            if (!redeem) {
              gameSectionText += `[-999] Internal server error\n`;
              continue;
            }

            // No data returned, add error message
            if (!redeem.data) {
              gameSectionText += `[${redeem.retcode}] ${redeem.message}\n`;
              continue;
            }

            // Data returned, add reward message
            gameSectionText += `Reward: ${code.rewards ? code.rewards : 'Unknown'}\n`;

            // Add event to the database
            if (u.collectData) {
              await addEvent(u.uid, {
                game: game.gameId,
                type: 'redeem',
                metadata: {
                  code: code.code,
                  reward: code.rewards,
                },
              });
            }

            // Add a 5.5 second delay between code redemptions to avoid rate limiting
            await delayMs(5500);
          }

          redeemContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(gameSectionText)
          );
          hasAddedSection = true;
        }

        if (didAttemptRedeem && u.notifyRedeem) {
          try {
            await client.users.send(u.uid, {
              components: [redeemContainer],
              flags: MessageFlags.IsComponentsV2,
            });
          } catch (/** @type {any} */ error) {
            if (error instanceof DiscordAPIError && error.code === 50007) {
              // User has DMs disabled, disable auto redeem
              logger.info(`[Cron:ARedeem] Disabling auto redeem for ${u.uid}`);
              await updateUser(u.uid, {
                field: 'notifyRedeem',
                value: false,
              });
            } else {
              logger.error(`[Cron:ARedeem] Failed to DM user: ${u.uid}`, {
                stack: error.stack,
              });
            }
          }
        }
      } catch (/** @type {any} */ error) {
        logger.error(`[Cron:ARedeem] Failed for user: ${u.uid}`, { stack: error.stack });
      } finally {
        await cleanAttemptedCodes(u.uid, availableCodes);
      }
    })
  );

  await Promise.allSettled(task).then((r) => {
    logger.info(`[Cron:ARedeem] Redeem completed for ${r.length} users`);
  });
}
