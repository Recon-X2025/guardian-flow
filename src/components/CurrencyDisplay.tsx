import { useCurrency } from '@/hooks/useCurrency';

interface CurrencyDisplayProps {
  amountInUSD: number;
  showSymbol?: boolean;
  className?: string;
}

export function CurrencyDisplay({ 
  amountInUSD, 
  showSymbol = true, 
  className = '' 
}: CurrencyDisplayProps) {
  const { formatCurrency } = useCurrency();
  
  return (
    <span className={className}>
      {formatCurrency(amountInUSD, showSymbol)}
    </span>
  );
}
