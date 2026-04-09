interface CurrencyAmountProps {
  amount: number;
  currency?: string;
  locale?: string;
  className?: string;
  /** When true, show the currency code next to the formatted amount */
  showCode?: boolean;
}

/**
 * Displays a numeric amount formatted according to `Intl.NumberFormat`
 * for the selected currency and locale.
 */
export function CurrencyAmount({
  amount,
  currency = 'GBP',
  locale = 'en-GB',
  className,
  showCode = false,
}: CurrencyAmountProps) {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <span className={className}>
      {formatted}
      {showCode && <span className="ml-1 text-xs text-muted-foreground">{currency}</span>}
    </span>
  );
}
