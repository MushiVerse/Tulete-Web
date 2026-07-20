export type PaymentMethod = 'CASH' | 'DIGITAL';

export interface RoundingResult {
  /** The final integer value after applying the correct rounding rules */
  display_amount: number;
  /** Indicates if the price was altered by rounding */
  is_rounded: boolean;
  /** The exact amount added or subtracted (useful for accounting logs) */
  rounding_difference: number;
}

/**
 * Handles price rounding logic for Tanzanian Shillings (TZS) based on local currency standards.
 * 
 * Rules:
 * - DIGITAL: Kept exact (converted to integer if float).
 * - CASH: Rounded to nearest 50 TZS using specific intervals:
 *   - xx01 to xx24 -> Rounds down to xx00
 *   - xx25 to xx74 -> Rounds to xx50
 *   - xx75 to xx99 -> Rounds up to next 100
 * 
 * @param raw_amount The exact calculated subtotal/price
 * @param payment_method 'CASH' or 'DIGITAL'
 */
export function calculateTZSRounding(
  raw_amount: number,
  payment_method: PaymentMethod
): RoundingResult {
  // Guard against floating point errors by resolving to the nearest whole integer first.
  // TZS doesn't use decimals (cents) in real-world pricing.
  const int_amount = Math.round(raw_amount);
  
  if (payment_method === 'DIGITAL') {
    return {
      display_amount: int_amount,
      is_rounded: int_amount !== raw_amount,
      rounding_difference: int_amount - raw_amount
    };
  }

  // Handle CASH rounding
  // We use the absolute value to ensure negative amounts (refunds) round symmetrically
  const isNegative = int_amount < 0;
  const abs_amount = Math.abs(int_amount);
  const remainder = abs_amount % 100;
  
  let rounded_abs = abs_amount;

  if (remainder >= 1 && remainder <= 24) {
    rounded_abs = abs_amount - remainder; // Round down to 00
  } else if (remainder >= 25 && remainder <= 74) {
    rounded_abs = abs_amount - remainder + 50; // Round to 50
  } else if (remainder >= 75 && remainder <= 99) {
    rounded_abs = abs_amount - remainder + 100; // Round up to 100
  }

  const final_amount = isNegative ? -rounded_abs : rounded_abs;

  return {
    display_amount: final_amount,
    is_rounded: final_amount !== raw_amount,
    rounding_difference: final_amount - raw_amount
  };
}

/**
 * Formats an amount to the standard TZS display format.
 * Tanzanian prices must be formatted with commas as thousands separators,
 * followed by the currency code suffix (e.g., "15,450 TZS").
 * 
 * @param amount The integer amount to format
 */
export function formatTZS(amount: number): string {
  // We use 'en-US' locale to ensure standard comma thousand separators
  return `${amount.toLocaleString('en-US')} TZS`;
}
