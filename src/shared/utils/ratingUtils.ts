/**
 * Computes a normalized rating (1.0 - 5.0) and review count for any item (product, food, laundry, store)
 * Matching the exact rating calculation logic used across Discovery and Home pages.
 */
export function getNormalizedRating(item: any): { rating: number; reviewCount: number } {
  if (!item) return { rating: 4.8, reviewCount: 15 };

  let rating = 0;
  let reviewCount = 0;

  if (Array.isArray(item.rate) && item.rate.length > 0) {
    const rates = item.rate.map(Number).filter((n: number) => !isNaN(n));
    if (rates.length > 0) {
      reviewCount = rates.length;
      rating = rates.reduce((sum: number, r: number) => sum + r, 0) / reviewCount;
    }
  } else if (item.rating !== undefined && Number(item.rating) > 0) {
    rating = Number(item.rating);
    reviewCount = item.reviewCount ? Number(item.reviewCount) : 1;
  }

  if (rating === 0 || reviewCount === 0) {
    const seedString = String(item.name || item.store || item.id || item.objectID || '5');
    let seed = 0;
    for (let i = 0; i < seedString.length; i++) {
      seed += seedString.charCodeAt(i);
    }
    rating = 4.5 + (seed % 5) / 10; // Gives 4.5, 4.6, 4.7, 4.8, 4.9
    reviewCount = 8 + (seed % 24); // Gives review counts between 8 and 31
  }

  return {
    rating: Math.round(rating * 10) / 10,
    reviewCount: Math.max(1, reviewCount)
  };
}

/**
 * Converts a selected rate value to a double float for Firestore documents.
 * Forces Firebase Web SDK to serialize the value as a double float so Firestore
 * stores it as a double type for Flutter compatibility.
 */
export function toFirestoreDouble(value: any): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return 0.000000000001;
  const rounded = parseFloat(num.toFixed(1));
  return Number.isInteger(rounded) ? rounded + 0.000000000001 : rounded;
}
