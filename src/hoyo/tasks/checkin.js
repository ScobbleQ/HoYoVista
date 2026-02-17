import pLimit from 'p-limit';
import { getUsersWithAutoCheckin } from '../../db/queries.js';
import { addEvent, updateUser } from '../../db/queries.js';
import { IdToFull } from '../../hoyo/utils/constants.js';
import logger from '../../utils/logger.js';
import { plural } from '../../utils/plural.js';
import { censorUid } from '../../utils/privacy.js';
import { fetchCheckin } from '../api/checkin.js';
import {
  RETCODE,
  createTaskContainer,
  getUserData,
  sendTaskNotification,
} from '../utils/taskHelpers.js';

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
        const [cookies, linkedGames] = await getUserData(u.uid);
        if (!cookies || linkedGames.length === 0) return;

        // Create container for check-in summary
        const checkinContainer = createTaskContainer('## Checkin Summary');
        let hasContent = false;

        // Perform check-in for all linked games
        for (const game of linkedGames) {
          // Automatic check-in is disabled, skip
          if (!game.autoCheckin) continue;

          // Add separator between games
          checkinContainer.addSeparatorComponents((separator) => separator);

          // Perform check-in
          const checkin = await fetchCheckin(/** @type {GameID} */ (game.gameId), { cookies });
          if (!checkin || checkin.status === 'Failed') {
            if (checkin?.status === 'Failed' && checkin.retcode === RETCODE.INVALID_COOKIES) {
              await updateUser(u.uid, {
                field: 'autoCheckin',
                value: false,
              });

              checkinContainer.addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                  [
                    `### ${IdToFull[game.gameId]} (${censorUid({ uid: game.gameRoleId, flag: u.private })})`,
                    'The cookies are invalid, please re-link your account.',
                    'We have disabled auto check-in for this account in the meantime.',
                  ].join('\n')
                )
              );

              hasContent = true;
              break;
            }

            checkinContainer.addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(
                [
                  `### ${IdToFull[game.gameId]} (${censorUid({ uid: game.gameRoleId, flag: u.private })})`,
                  `Failed to check-in with code \`${checkin?.retcode}\``,
                  checkin?.message,
                ].join('\n')
              )
            );
            hasContent = true;
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
            hasContent = true;
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
            hasContent = true;
          }
        }

        // Send check-in summary to user
        if (hasContent && u.notifyCheckin) {
          await sendTaskNotification(client, u.uid, checkinContainer, 'ACheckin', 'notifyCheckin');
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
