import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CurrencyInfo = {
  code: string;
  symbol: string;
  country: string;
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

  useEffect(() => {
    fetchUserCurrency();
  }, []);

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

  const formatCurrency = (amount: number, showSymbol = true): string => {
    const formattedAmount = Number(amount).toFixed(2);
    return showSymbol 
      ? `${currencyInfo.symbol}${formattedAmount}`
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
    formatCurrency,
    updateCurrency,
  };
}