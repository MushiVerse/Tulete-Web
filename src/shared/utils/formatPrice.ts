import { useCurrencyLanguageStore } from '../../core/config/currencyStore';
import { useState, useEffect } from 'react';

/**
 * Formats a price by converting base TZS into the currently selected language's currency.
 * If TZS: rounds to nearest 100 or formats as whole number.
 * If USD/EUR/AED/CNY: converts based on exchange rate and formats with 2 decimal places.
 */
export function formatPrice(priceInTZS: number): string {
  if (isNaN(priceInTZS) || priceInTZS == null) {
    return "0";
  }

  const { currentLanguage } = useCurrencyLanguageStore.getState();

  // Base Currency: TZS
  if (currentLanguage.currency === 'TZS') {
    const roundedPrice = Math.round(priceInTZS / 100) * 100;
    return roundedPrice.toLocaleString();
  }

  // Converted Currency (USD, EUR, AED, CNY)
  const converted = priceInTZS * currentLanguage.rate;
  return converted.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

/**
 * React hook to get real-time price formatting and currency symbol.
 * Component automatically re-renders whenever language or currency changes.
 */
export function useFormattedPrice(priceInTZS: number) {
  const currentLanguage = useCurrencyLanguageStore((state) => state.currentLanguage);
  
  const formatted = formatPrice(priceInTZS);
  return {
    symbol: currentLanguage.symbol,
    formatted,
    fullText: `${currentLanguage.symbol} ${formatted}`
  };
}
