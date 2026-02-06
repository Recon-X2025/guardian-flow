import { useState, useEffect } from 'react';
import { apiClient } from '@/integrations/api/client';
import { useAuth } from '@/domains/auth/contexts/AuthContext';

export type CurrencyInfo = {
  code: string;
  symbol: string;
  country: string;
};

export type ExchangeRates = {
  [key: string]: number;
};

const CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  'US': { code: 'USD', symbol: '$' },
  'GB': { code: 'GBP', symbol: '£' },
  'EU': { code: 'EUR', symbol: '€' },
  'DE': { code: 'EUR', symbol: '€' },
  'FR': { code: 'EUR', symbol: '€' },
  'IT': { code: 'EUR', symbol: '€' },
  'ES': { code: 'EUR', symbol: '€' },
  'IN': { code: 'INR', symbol: '₹' },
  'JP': { code: 'JPY', symbol: '¥' },
  'CN': { code: 'CNY', symbol: '¥' },
  'AU': { code: 'AUD', symbol: 'A$' },
  'CA': { code: 'CAD', symbol: 'C$' },
  'SG': { code: 'SGD', symbol: 'S$' },
  'AE': { code: 'AED', symbol: 'د.إ' },
  'SA': { code: 'SAR', symbol: '﷼' },
  'ZA': { code: 'ZAR', symbol: 'R' },
  'BR': { code: 'BRL', symbol: 'R$' },
  'MX': { code: 'MXN', symbol: 'Mex$' },
};

// Fallback exchange rates (approximate, updated manually as needed)
const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  INR: 83.12,
  JPY: 149.50,
  CNY: 7.24,
  AUD: 1.52,
  CAD: 1.36,
  SGD: 1.34,
  AED: 3.67,
  SAR: 3.75,
  ZAR: 18.20,
  BRL: 4.97,
  MXN: 17.08,
};

export function useCurrency() {
  const { user } = useAuth(); // Must be declared before useEffects that use it
  
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo>({
    code: 'USD',
    symbol: '$',
    country: 'US',
  });
  const [loading, setLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(FALLBACK_RATES);
  const [ratesLoading, setRatesLoading] = useState(false);

  const fetchUserCurrency = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      // Try to fetch profile, but handle gracefully if columns don't exist
      try {
        const result = await apiClient.from('profiles')
          .select('country, currency')
          .eq('id', user.id);

        if (result.error) {
          console.warn('Error fetching profile, using defaults:', result.error);
          setLoading(false);
          return;
        }

        const profile = Array.isArray(result.data) ? result.data[0] : result.data;
        if (profile && (profile.country || profile.currency)) {
          const countryCode = profile.country || 'US';
          const currencyCode = profile.currency || CURRENCY_MAP[countryCode]?.code || 'USD';
          const symbol = CURRENCY_MAP[countryCode]?.symbol || '$';

          setCurrencyInfo({
            code: currencyCode,
            symbol: symbol,
            country: countryCode,
          });
        }
      } catch (error) {
        // If columns don't exist or query fails, use defaults
        console.warn('Profile query failed, using default currency:', error);
      }
    } catch (error) {
      console.error('Error fetching currency:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRates = async () => {
    setRatesLoading(true);
    try {
      // Try to fetch from API, but fallback to hardcoded rates if not available
      const response = await apiClient.functions.invoke('get-exchange-rates', {
        body: { 
          baseCurrency: 'USD',
          targetCurrencies: Object.values(CURRENCY_MAP).map(c => c.code)
        }
      });

      if (response.error) {
        console.warn('Exchange rate API error, using fallback rates:', response.error);
        setExchangeRates(FALLBACK_RATES);
        return;
      }
      
      if (response.data?.rates) {
        console.log('Exchange rates loaded:', response.data.rates);
        setExchangeRates(response.data.rates);
      } else {
        console.warn('No rates in response, using fallback rates');
        setExchangeRates(FALLBACK_RATES);
      }
    } catch (error) {
      console.error('Error fetching exchange rates, using fallback rates:', error);
      setExchangeRates(FALLBACK_RATES);
    } finally {
      setRatesLoading(false);
    }
  };

  const convertAmount = (amountInUSD: number, targetCurrency?: string): number => {
    const target = targetCurrency || currencyInfo.code;
    
    // If converting to USD, return original
    if (target === 'USD') {
      return amountInUSD;
    }

    // Get rate, fallback to hardcoded rates if not available
    const rate = exchangeRates[target] || FALLBACK_RATES[target] || 1;
    const converted = amountInUSD * rate;
    
    console.log(`Converting ${amountInUSD} USD to ${target}: ${converted} (rate: ${rate})`);
    return converted;
  };

  const formatCurrency = (
    amountInUSD: number, 
    showSymbol = true, 
    targetCurrency?: string
  ): string => {
    const target = targetCurrency || currencyInfo.code;
    
    // Find symbol for target currency
    let symbol = '$';
    if (targetCurrency) {
      const currencyEntry = Object.entries(CURRENCY_MAP).find(([_, curr]) => curr.code === targetCurrency);
      symbol = currencyEntry ? currencyEntry[1].symbol : '$';
    } else {
      symbol = currencyInfo.symbol;
    }

    const convertedAmount = convertAmount(amountInUSD, target);
    const formattedAmount = Number(convertedAmount).toFixed(2);
    
    const formatted = showSymbol 
      ? `${symbol}${formattedAmount}`
      : formattedAmount;
      
    console.log(`Formatted ${amountInUSD} USD as ${formatted} (${target})`);
    return formatted;
  };

  const updateCurrency = async (country: string) => {
    try {
      if (!user) return { success: false, error: 'Not authenticated' };

      const newCurrency = CURRENCY_MAP[country] || { code: 'USD', symbol: '$' };

      const result = await apiClient.from('profiles')
        .update({
          country: country,
          currency: newCurrency.code,
        })
        .eq('id', user.id);
      
      const error = result.error;

      if (error) throw error;

      setCurrencyInfo({
        code: newCurrency.code,
        symbol: newCurrency.symbol,
        country: country,
      });

      // Refresh exchange rates after currency change
      await fetchExchangeRates();

      return { success: true };
    } catch (error: unknown) {
      console.error('Error updating currency:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserCurrency();
      fetchExchangeRates();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Refresh rates when currency changes
    if (currencyInfo.code !== 'USD') {
      fetchExchangeRates();
    }
  }, [currencyInfo.code]);

  return {
    currencyInfo,
    loading,
    ratesLoading,
    exchangeRates,
    formatCurrency,
    convertAmount,
    updateCurrency,
    refreshRates: fetchExchangeRates,
  };
}