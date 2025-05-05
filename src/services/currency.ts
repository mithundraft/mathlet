/**
 * Represents currency information.
 */
export interface Currency {
  /**
   * The currency code (e.g., USD, EUR, JPY).
   */
  code: string;
  /**
   * The exchange rate relative to a base currency (e.g., USD).
   */
  exchangeRate: number;
  /**
   * The currency symbol (e.g. $, ¥, etc.)
   */
  symbol: string;
}

/**
 * Asynchronously retrieves currency information for a given currency code.
 *
 * @param currencyCode The currency code to retrieve information for.
 * @returns A promise that resolves to a Currency object containing currency details.
 */
export async function getCurrency(currencyCode: string): Promise<Currency> {
  // TODO: Implement this by calling an API.

  return {
    code: currencyCode,
    exchangeRate: 1.0,
    symbol: '$'
  };
}

/**
* Asynchronously converts an amount from one currency to another.
*
* @param fromCurrency The currency code to convert from.
* @param toCurrency The currency code to convert to.
* @param amount The amount to convert.
* @returns A promise that resolves to the converted amount.
*/
export async function convertCurrency(fromCurrency: string, toCurrency: string, amount: number): Promise<number> {
    // TODO: Implement this by calling an API.

    return amount;
}
