-- Fix search_path for currency symbol function
DROP FUNCTION IF EXISTS public.get_currency_symbol(TEXT);

CREATE OR REPLACE FUNCTION public.get_currency_symbol(currency_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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