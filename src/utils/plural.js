/**
 * Pluralize a word based on the count
 * @param {number} count - The count of the word
 * @param {string} word - The word to pluralize
 * @returns {string} - The pluralized word
 */
export const plural = (count, word) => {
  return count === 1 ? word : `${word}s`;
};
