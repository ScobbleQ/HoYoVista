import { Games, HK4E_API, PUBLIC_API } from './constants.js';

/** @typedef {import("../../utils/typedef.js").GameID} GameID */

/**
 * @param {GameID} game
 * @returns {string}
 */
export function getEventUrl(game) {
  if (game === Games.GENSHIN) {
    return HK4E_API;
  } else if (game === Games.ZZZ || game === Games.HONKAI || game === Games.STARRAIL) {
    return PUBLIC_API;
  } else {
    return '';
  }
}
