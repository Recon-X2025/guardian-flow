import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export function useCurrency() {
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo>({
    code: 'USD',
    symbol: '$',
    country: 'US',
  });
  const [loading, setLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [ratesLoading, setRatesLoading] = useState(false);

  useEffect(() => {
    fetchUserCurrency();
    fetchExchangeRates();
  }, []);

  useEffect(() => {
    // Refresh rates when currency changes
    if (currencyInfo.code !== 'USD') {
      fetchExchangeRates();
    }
  }, [currencyInfo.code]);

  const fetchUserCurrency = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('country, currency')
        .eq('id', user.id)
        .single();

      if (profile) {
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
      console.error('Error fetching currency:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRates = async () => {
    setRatesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-exchange-rates', {
        body: { 
          baseCurrency: 'USD',
          targetCurrencies: Object.values(CURRENCY_MAP).map(c => c.code)
        }
      });

      if (error) throw error;
      if (data?.rates) {
        setExchangeRates(data.rates);
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Fallback to 1:1 if API fails
      setExchangeRates({ USD: 1 });
    } finally {
      setRatesLoading(false);
    }
  };

  const convertAmount = (amountInUSD: number, targetCurrency?: string): number => {
    const target = targetCurrency || currencyInfo.code;
    
    // If converting to USD or no rates available, return original
    if (target === 'USD' || !exchangeRates[target]) {
      return amountInUSD;
    }

    // Convert from USD to target currency
    const rate = exchangeRates[target];
    return amountInUSD * rate;
  };

  const formatCurrency = (
    amountInUSD: number, 
    showSymbol = true, 
    targetCurrency?: string
  ): string => {
    const target = targetCurrency || currencyInfo.code;
    const symbol = targetCurrency 
      ? Object.values(CURRENCY_MAP).find(c => c.code === targetCurrency)?.symbol || '$'
      : currencyInfo.symbol;

    const convertedAmount = convertAmount(amountInUSD, target);
    const formattedAmount = Number(convertedAmount).toFixed(2);
    
    return showSymbol 
      ? `${symbol}${formattedAmount}`
      : formattedAmount;
  };

  const updateCurrency = async (country: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newCurrency = CURRENCY_MAP[country] || { code: 'USD', symbol: '$' };

      const { error } = await supabase
        .from('profiles')
        .update({
          country: country,
          currency: newCurrency.code,
        })
        .eq('id', user.id);

      if (error) throw error;

      setCurrencyInfo({
        code: newCurrency.code,
        symbol: newCurrency.symbol,
        country: country,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating currency:', error);
      return { success: false, error: error.message };
    }
  };

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