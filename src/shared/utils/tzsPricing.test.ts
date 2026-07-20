import { calculateTZSRounding, formatTZS } from './tzsPricing';

// NOTE: Since the project does not have vitest configured in package.json by default,
// you can run these with your preferred testing framework (jest/vitest).

describe('tzsPricing Module', () => {
  describe('DIGITAL payment method', () => {
    it('should not round exact integers', () => {
      const result = calculateTZSRounding(15424, 'DIGITAL');
      expect(result.display_amount).toBe(15424);
      expect(result.is_rounded).toBe(false);
      expect(result.rounding_difference).toBe(0);
    });

    it('should safely round floating point errors to the nearest integer', () => {
      const result = calculateTZSRounding(15424.6, 'DIGITAL');
      expect(result.display_amount).toBe(15425);
      expect(result.is_rounded).toBe(true);
      expect(result.rounding_difference).toBeCloseTo(0.4);
    });
  });

  describe('CASH payment method', () => {
    it('should round down to 00 when the last two digits are 01 to 24', () => {
      const result = calculateTZSRounding(15424, 'CASH');
      expect(result.display_amount).toBe(15400);
      expect(result.is_rounded).toBe(true);
      expect(result.rounding_difference).toBe(-24);
      
      const edgeResult = calculateTZSRounding(15401, 'CASH');
      expect(edgeResult.display_amount).toBe(15400);
      expect(edgeResult.rounding_difference).toBe(-1);
    });

    it('should round to 50 when the last two digits are 25 to 74', () => {
      const result1 = calculateTZSRounding(15425, 'CASH');
      expect(result1.display_amount).toBe(15450);
      expect(result1.rounding_difference).toBe(25);

      const result2 = calculateTZSRounding(15474, 'CASH');
      expect(result2.display_amount).toBe(15450);
      expect(result2.rounding_difference).toBe(-24);
    });

    it('should round up to the next 100 when the last two digits are 75 to 99', () => {
      const result1 = calculateTZSRounding(15475, 'CASH');
      expect(result1.display_amount).toBe(15500);
      expect(result1.rounding_difference).toBe(25);

      const result2 = calculateTZSRounding(15499, 'CASH');
      expect(result2.display_amount).toBe(15500);
      expect(result2.rounding_difference).toBe(1);
    });

    it('should handle exactly 00 without any additional rounding', () => {
      const result = calculateTZSRounding(15400, 'CASH');
      expect(result.display_amount).toBe(15400);
      expect(result.is_rounded).toBe(false);
      expect(result.rounding_difference).toBe(0);
    });

    it('should handle exactly 50 without any additional rounding', () => {
      const result = calculateTZSRounding(15450, 'CASH');
      expect(result.display_amount).toBe(15450);
      expect(result.is_rounded).toBe(false);
      expect(result.rounding_difference).toBe(0);
    });

    it('should safely convert floats before applying CASH rounding', () => {
      const result = calculateTZSRounding(15424.99, 'CASH'); 
      // 15424.99 -> 15425 -> ends in 25 -> rounds to 50
      expect(result.display_amount).toBe(15450);
      expect(result.is_rounded).toBe(true);
      expect(result.rounding_difference).toBeCloseTo(25.01);
    });

    it('should handle negative numbers (refunds) symmetrically', () => {
      const result = calculateTZSRounding(-15424, 'CASH');
      expect(result.display_amount).toBe(-15400);
      // It went from -15424 to -15400, which is an addition of +24.
      expect(result.rounding_difference).toBe(24);
      
      const result2 = calculateTZSRounding(-15475, 'CASH');
      expect(result2.display_amount).toBe(-15500);
      // It went from -15475 to -15500, which is subtraction of -25.
      expect(result2.rounding_difference).toBe(-25);
    });
  });

  describe('formatTZS Display Helper', () => {
    it('formats standard prices with comma separators and TZS suffix', () => {
      expect(formatTZS(15450)).toBe('15,450 TZS');
      expect(formatTZS(1000000)).toBe('1,000,000 TZS');
    });

    it('formats negative numbers correctly', () => {
      expect(formatTZS(-15450)).toBe('-15,450 TZS');
    });
  });
});
