import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator } from "lucide-react";

const modules = [
  { id: "field-service", name: "Field Service Management", price: 1500 },
  { id: "asset-lifecycle", name: "Asset Lifecycle Management", price: 1200 },
  { id: "ai-forecasting", name: "AI Forecasting & Scheduling", price: 1800 },
  { id: "fraud-compliance", name: "Fraud Detection & Compliance", price: 2000 },
  { id: "marketplace", name: "Marketplace & Extensions", price: 800 },
  { id: "analytics-bi", name: "Analytics & BI Integration", price: 1000 },
  { id: "customer-portal", name: "Customer Portal", price: 600 },
  { id: "video-training", name: "Video Training & Knowledge Base", price: 400 },
];

const userTiers = [
  { value: "1-50", label: "1-50 users", multiplier: 1.0 },
  { value: "51-100", label: "51-100 users", multiplier: 1.2 },
  { value: "101-200", label: "101-200 users", multiplier: 1.4 },
  { value: "201-500", label: "201-500 users", multiplier: 1.6 },
  { value: "501+", label: "501+ users", multiplier: 2.0 },
];

const billingFrequencies = [
  { value: "monthly", label: "Monthly", discount: 0 },
  { value: "quarterly", label: "Quarterly", discount: 0.06 },
  { value: "annual", label: "Annual", discount: 0.175 },
  { value: "3-year", label: "3-Year", discount: 0.275 },
];

export default function PricingCalculator() {
  const navigate = useNavigate();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [userTier, setUserTier] = useState("1-50");
  const [billingFrequency, setBillingFrequency] = useState("monthly");

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const calculatePrice = () => {
    const basePrice = modules
      .filter((m) => selectedModules.includes(m.id))
      .reduce((sum, m) => sum + m.price, 0);

    // Multi-module discount
    let moduleDiscount = 0;
    if (selectedModules.length >= 7) moduleDiscount = 0.25;
    else if (selectedModules.length >= 5) moduleDiscount = 0.15;
    else if (selectedModules.length >= 3) moduleDiscount = 0.1;

    const afterModuleDiscount = basePrice * (1 - moduleDiscount);

    // User volume multiplier
    const userMultiplier = userTiers.find((t) => t.value === userTier)?.multiplier || 1.0;
    const afterUserAdjustment = afterModuleDiscount * userMultiplier;

    // Billing frequency discount
    const billingDiscount =
      billingFrequencies.find((b) => b.value === billingFrequency)?.discount || 0;
    const finalPrice = afterUserAdjustment * (1 - billingDiscount);

    return {
      basePrice,
      moduleDiscount,
      afterModuleDiscount,
      userMultiplier,
      afterUserAdjustment,
      billingDiscount,
      finalPrice,
    };
  };

  const pricing = calculatePrice();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              <span className="text-xl font-bold">Pricing Calculator</span>
            </div>
          </div>
          <Button onClick={() => navigate("/auth")}>Get Started</Button>
        </div>
      </header>

      <div className="container py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Modules</CardTitle>
                <CardDescription>Choose the modules you need for your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.map((module) => (
                  <div key={module.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={module.id}
                      checked={selectedModules.includes(module.id)}
                      onCheckedChange={() => toggleModule(module.id)}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={module.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {module.name}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        ${module.price.toLocaleString()}/month
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Volume</CardTitle>
                <CardDescription>Select your expected number of active users</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={userTier} onValueChange={setUserTier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {userTiers.map((tier) => (
                      <SelectItem key={tier.value} value={tier.value}>
                        {tier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing Frequency</CardTitle>
                <CardDescription>Choose how often you'd like to be billed</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={billingFrequency} onValueChange={setBillingFrequency}>
                  {billingFrequencies.map((freq) => (
                    <div key={freq.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={freq.value} id={freq.value} />
                      <Label htmlFor={freq.value} className="cursor-pointer flex-1">
                        {freq.label}
                        {freq.discount > 0 && (
                          <span className="text-sm text-primary ml-2">
                            (Save {(freq.discount * 100).toFixed(0)}%)
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Price Summary</CardTitle>
                <CardDescription>Your customized pricing breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedModules.length > 0 ? (
                  <>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Price</span>
                        <span className="font-medium">
                          ${pricing.basePrice.toLocaleString()}
                        </span>
                      </div>
                      {pricing.moduleDiscount > 0 && (
                        <div className="flex justify-between text-success">
                          <span>Multi-Module Discount</span>
                          <span>-{(pricing.moduleDiscount * 100).toFixed(0)}%</span>
                        </div>
                      )}
                      {pricing.userMultiplier > 1 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">User Volume Adjustment</span>
                          <span>×{pricing.userMultiplier.toFixed(1)}</span>
                        </div>
                      )}
                      {pricing.billingDiscount > 0 && (
                        <div className="flex justify-between text-success">
                          <span>Billing Frequency Discount</span>
                          <span>-{(pricing.billingDiscount * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${pricing.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            per {billingFrequency === "monthly" ? "month" : billingFrequency === "quarterly" ? "quarter" : "year"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => navigate("/auth")}>
                      Get Started
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Select modules to see pricing</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
