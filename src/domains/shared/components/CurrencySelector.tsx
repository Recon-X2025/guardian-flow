import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CURRENCIES: { code: string; flag: string; label: string }[] = [
  { code: 'USD', flag: '🇺🇸', label: 'US Dollar' },
  { code: 'EUR', flag: '🇪🇺', label: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', label: 'British Pound' },
  { code: 'JPY', flag: '🇯🇵', label: 'Japanese Yen' },
  { code: 'CAD', flag: '🇨🇦', label: 'Canadian Dollar' },
  { code: 'AUD', flag: '🇦🇺', label: 'Australian Dollar' },
];

interface CurrencySelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CurrencySelector({
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Select currency',
}: CurrencySelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map(({ code, flag, label }) => (
          <SelectItem key={code} value={code}>
            <span className="flex items-center gap-2">
              <span>{flag}</span>
              <span>{code}</span>
              <span className="text-muted-foreground text-xs">— {label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
