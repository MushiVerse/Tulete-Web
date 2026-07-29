/**
 * Calculates Levenshtein Distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion, deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Checks if a search query fuzzy matches a target text (with typo tolerance).
 */
export function isFuzzyMatch(query: string, targetText: string): boolean {
  if (!query || !query.trim()) return true;
  if (!targetText) return false;

  const normalizedQuery = query.toLowerCase().trim();
  const normalizedTarget = targetText.toLowerCase().trim();

  // Direct substring match
  if (normalizedTarget.includes(normalizedQuery)) return true;

  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  const targetWords = normalizedTarget.split(/[\s,.\-_/]+/).filter(Boolean);

  return queryWords.every((qWord) => {
    return targetWords.some((tWord) => {
      // Direct substring or prefix match
      if (tWord.includes(qWord) || qWord.includes(tWord)) return true;

      // Typo tolerance based on query word length
      const maxDistance = qWord.length <= 2 ? 0 : qWord.length <= 5 ? 1 : 2;
      return levenshteinDistance(qWord, tWord) <= maxDistance;
    });
  });
}

/**
 * Performs fuzzy search across multiple fields of an object.
 */
export function isItemFuzzyMatch(query: string, item: any, fields: string[] = ['name', 'brand', 'store', 'category', 'cat', 'description']): boolean {
  if (!query || !query.trim()) return true;
  if (!item) return false;

  const combinedText = fields
    .map((field) => item[field])
    .filter(Boolean)
    .join(' ');

  return isFuzzyMatch(query, combinedText);
}
