-- Add country and currency fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Create a function to get currency symbol
CREATE OR REPLACE FUNCTION public.get_currency_symbol(currency_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE currency_code
    WHEN 'USD' THEN '$'
    WHEN 'EUR' THEN '€'
    WHEN 'GBP' THEN '£'
    WHEN 'INR' THEN '₹'
    WHEN 'JPY' THEN '¥'
    WHEN 'AUD' THEN 'A$'
    WHEN 'CAD' THEN 'C$'
    WHEN 'CNY' THEN '¥'
    WHEN 'SGD' THEN 'S$'
    WHEN 'AED' THEN 'د.إ'
    WHEN 'SAR' THEN '﷼'
    WHEN 'ZAR' THEN 'R'
    WHEN 'BRL' THEN 'R$'
    WHEN 'MXN' THEN 'Mex$'
    ELSE currency_code || ' '
  END;
END;
$$;

COMMENT ON COLUMN public.profiles.country IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN public.profiles.currency IS 'ISO 4217 currency code';