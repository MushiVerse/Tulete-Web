/**
 * Formats a price by rounding it to the nearest 100 to avoid small change (cents).
 * For example: 250 becomes 300, 240 becomes 200.
 */
export function formatPrice(price: number): string {
  if (isNaN(price) || price == null) {
    return "0";
  }
  const roundedPrice = Math.round(price / 100) * 100;
  return roundedPrice.toLocaleString();
}
