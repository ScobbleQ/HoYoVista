import { ContainerBuilder, DiscordAPIError, MessageFlags } from 'discord.js';
import pLimit from 'p-limit';
import {
  addEvent,
  getCookies,
  getUserLinkedGames,
  getUsersWithAutoCheckin,
  updateUser,
} from '../../db/queries.js';
import { IdToFull } from '../../hoyo/utils/constants.js';
import logger from '../../utils/logger.js';
import { plural } from '../../utils/plural.js';
import { censorUid } from '../../utils/privacy.js';
import { fetchCheckin } from '../api/checkin.js';

/** @typedef {import("../../utils/typedef.js").GameID} GameID */

/**
 * @param {import("discord.js").Client} client
 */
export async function autoCheckin(client) {
  // Random delay between 0 and 55 minutes
  const delay = Math.floor(Math.random() * 56) * 60 * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Get all users with auto check-in enabled
  const users = await getUsersWithAutoCheckin();
  const limit = pLimit(10);

  logger.info(`[Cron:ACheckin] Starting check-in for ${users.length} users`);
  const task = users.map((u) =>
    limit(async () => {
      try {
        // Get cookies and linked games for user
        const [cookies, linkedGames] = await Promise.all([
          getCookies(u.uid),
          getUserLinkedGames(u.uid),
        ]);

        // If no cookies or linked games, skip
        if (!cookies || linkedGames.length === 0) return;

        // Create container for check-in summary
        const checkinContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`# Checkin Summary\n-# <t:${Math.floor(Date.now() / 1000)}:F>`)
        );

        // Perform check-in for all linked games
        for (const game of linkedGames) {
          // Automatic check-in is disabled, skip
          if (!game.autoCheckin) continue;

          // Add separator between games
          checkinContainer.addSeparatorComponents((separator) => separator);

          // Perform check-in
          const checkin = await fetchCheckin(/** @type {GameID} */ (game.gameId), { cookies });
          if (!checkin || checkin.status === 'Failed') {
            checkinContainer.addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(
                [
                  `### ${IdToFull[game.gameId]} (${censorUid({ uid: game.gameRoleId, flag: u.private })})`,
                  `Failed to check-in with code \`${checkin?.retcode}\``,
                  checkin?.message,
                ].join('\n')
              )
            );
          } else if (checkin.status === 'SuccessNoDetails') {
            if (u.collectData) {
              await addEvent(u.uid, {
                game: game.gameId,
                type: 'checkin',
              });
            }

            checkinContainer.addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(
                [
                  `### ${IdToFull[game.gameId]} (${censorUid({ uid: game.gameRoleId, flag: u.private })})`,
                  'Daily Check-in Claimed',
                  '-# No checkin details available',
                ].join('\n')
              )
            );
          } else {
            if (u.collectData) {
              await addEvent(u.uid, {
                game: game.gameId,
                type: 'checkin',
                metadata: {
                  reward: checkin.award.name,
                  amount: checkin.award.cnt,
                },
              });
            }

            checkinContainer.addSectionComponents((section) =>
              section
                .addTextDisplayComponents((textDisplay) =>
                  textDisplay.setContent(
                    [
                      `### ${IdToFull[game.gameId]} (${censorUid({ uid: game.gameRoleId, flag: u.private })})`,
                      'Daily Check-in Claimed',
                      `${checkin.award.name} x${checkin.award.cnt}`,
                      `${checkin.missedDays > 0 ? `-# Missed ${checkin.missedDays} ${plural(checkin.missedDays, 'day')}` : ''}`.trim(),
                    ].join('\n')
                  )
                )
                .setThumbnailAccessory((thumbnail) => thumbnail.setURL(checkin.award.icon))
            );
          }
        }

        // Send check-in summary to user
        if (u.notifyCheckin) {
          try {
            await client.users.send(u.uid, {
              components: [checkinContainer],
              flags: MessageFlags.IsComponentsV2,
            });
          } catch (/** @type {any} */ error) {
            if (error instanceof DiscordAPIError && error.code === 50007) {
              // User has DMs disabled, disable auto check-in
              await updateUser(u.uid, {
                field: 'notifyCheckin',
                value: false,
              });
            } else {
              logger.error(`[Cron:ACheckin] Failed to DM user: ${u.uid}`, {
                stack: error.stack,
              });
            }
          }
        }
      } catch (/** @type {any} */ error) {
        logger.error(`[Cron:ACheckin] Auto Checkin: Failed for user: ${u.uid}`, {
          stack: error.stack,
        });
      }
    })
  );

  await Promise.allSettled(task).then((r) => {
    logger.info(`[Cron:ACheckin] Check-in completed for ${r.length} users`);
  });
}
