import * as React from "react";
import { Check, ChevronsUpDown, Building2, Activity, Factory, Zap, Truck, DollarSign, Monitor, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIndustryTerminology, IndustryType } from "@/contexts/IndustryTerminologyContext";

const industries = [
  { value: 'generic' as IndustryType, label: 'Generic / Field Service', icon: Building2 },
  { value: 'healthcare' as IndustryType, label: 'Healthcare', icon: Activity },
  { value: 'manufacturing' as IndustryType, label: 'Manufacturing', icon: Factory },
  { value: 'utilities' as IndustryType, label: 'Utilities & Energy', icon: Zap },
  { value: 'logistics' as IndustryType, label: 'Logistics & Transportation', icon: Truck },
  { value: 'finance' as IndustryType, label: 'Finance & Insurance', icon: DollarSign },
  { value: 'it' as IndustryType, label: 'IT & Technology', icon: Monitor },
  { value: 'retail' as IndustryType, label: 'Retail & Supply Chain', icon: Store },
];

const industryLabels: Record<IndustryType, string> = {
  generic: 'Generic / Field Service',
  healthcare: 'Healthcare',
  manufacturing: 'Manufacturing',
  utilities: 'Utilities & Energy',
  logistics: 'Logistics & Transportation',
  finance: 'Finance & Insurance',
  it: 'IT & Technology',
  retail: 'Retail & Supply Chain',
};

export function IndustrySelector() {
  const [open, setOpen] = React.useState(false);
  const { industryType, setIndustryType, loading } = useIndustryTerminology();

  const currentIndustry = industries.find(industry => industry.value === industryType);
  const Icon = currentIndustry?.icon || Building2;

  const handleSelect = async (industry: IndustryType) => {
    setOpen(false);
    await setIndustryType(industry);
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Building2 className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          size="sm"
          className="w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <span className="truncate">
              {industryLabels[industryType] || 'Select Industry'}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search industry..." />
          <CommandList>
            <CommandEmpty>No industry found.</CommandEmpty>
            <CommandGroup heading="Select Industry">
              {industries.map((industry) => {
                const IndustryIcon = industry.icon;
                return (
                  <CommandItem
                    key={industry.value}
                    value={industry.value}
                    onSelect={() => handleSelect(industry.value)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <IndustryIcon className="h-4 w-4 text-primary" />
                      <span className="flex-1">{industry.label}</span>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          industryType === industry.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Compact version for tight spaces
export function IndustrySelectorCompact() {
  const { industryType, loading } = useIndustryTerminology();
  const currentIndustry = industries.find(industry => industry.value === industryType);
  const Icon = currentIndustry?.icon || Building2;

  if (loading) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span className="truncate max-w-[120px]">
        {industryLabels[industryType]}
      </span>
    </div>
  );
}

