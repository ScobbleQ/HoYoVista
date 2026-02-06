import { getUserLinkedGames } from '../../db/queries.js';
import { IdToAbbr } from './constants.js';

/** @typedef {{ id: number; code: string; rewards: string | null }} ApiResponseCode */

/**
 *
 * @param {string} uid
 * @param {Record<string, ApiResponseCode[]>} availableCodes
 */
export async function cleanAttemptedCodes(uid, availableCodes) {
  const games = await getUserLinkedGames(uid);

  for (const game of games) {
    const gameCodes = availableCodes[IdToAbbr[game.gameId]];

    const activeCodes = game.attemptedCodes.filter((code) =>
      gameCodes.some((c) => c.code === code)
    );

    //
    if (activeCodes.length !== game.attemptedCodes.length) {
    }
  }
}
