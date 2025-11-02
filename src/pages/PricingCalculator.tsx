import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator } from "lucide-react";

// Market-aligned pricing structure
// Base platform fee (infrastructure) + optional module add-ons (all modules are add-ons)
// Guardian Flow is a unified enterprise operations platform - FSM is just one module

const modules = [
  { id: "field-service", name: "Field Service Management", basePrice: 150, perUserPrice: 49 },
  { id: "asset-lifecycle", name: "Asset Lifecycle Management", basePrice: 100, perUserPrice: 15 },
  { id: "ai-forecasting", name: "AI Forecasting & Scheduling", basePrice: 200, perUserPrice: 25 },
  { id: "fraud-compliance", name: "Fraud Detection & Compliance", basePrice: 300, perUserPrice: 35 },
  { id: "marketplace", name: "Marketplace & Extensions", basePrice: 100, perUserPrice: 10 },
  { id: "analytics-bi", name: "Analytics & BI Integration", basePrice: 250, perUserPrice: 20 },
  { id: "customer-portal", name: "Customer Portal", basePrice: 50, perUserPrice: 5 },
  { id: "video-training", name: "Video Training & Knowledge Base", basePrice: 50, perUserPrice: 5 },
];

// Base platform fee (infrastructure, security, multi-tenancy, RBAC, APIs, etc.)
// Per-user pricing model - scales with customer size
// Infrastructure costs scale with users (API calls, storage, compute, auth)
const BASE_PLATFORM_FEE_PER_USER = 15; // $15/user/month for platform infrastructure

// User count ranges - used for calculating per-user costs
const userTiers = [
  { value: "1-10", label: "1-10 users", count: 10, perUserPrice: 49 },
  { value: "11-25", label: "11-25 users", count: 25, perUserPrice: 49 },
  { value: "26-50", label: "26-50 users", count: 50, perUserPrice: 89 },
  { value: "51-100", label: "51-100 users", count: 100, perUserPrice: 89 },
  { value: "101-200", label: "101-200 users", count: 200, perUserPrice: 139 },
  { value: "201-500", label: "201-500 users", count: 500, perUserPrice: 139 },
  { value: "501+", label: "501+ users", count: 500, perUserPrice: 189 }, // Custom pricing after 500
];

const pricingModels = [
  { value: "subscription", label: "Subscription Model", description: "Fixed monthly fee per user" },
  { value: "pay-as-you-go", label: "Pay-As-You-Go", description: "Pay only for what you use" },
  { value: "hybrid", label: "Hybrid Model", description: "Base subscription + usage-based" },
];

const billingFrequencies = [
  { value: "monthly", label: "Monthly", discount: 0 },
  { value: "quarterly", label: "Quarterly", discount: 0.06 },
  { value: "annual", label: "Annual", discount: 0.175 },
  { value: "3-year", label: "3-Year", discount: 0.275 },
];

// Pay-per-use pricing (usage-based)
const usageBasedPricing = {
  // Base platform infrastructure (still needed)
  platformFeePerUser: 5, // Reduced platform fee for pay-as-you-go (no module subscriptions)
  
  // Usage-based charges per operation
  workOrderProcessed: 2.50, // $2.50 per work order processed
  apiCall: 0.10, // $0.10 per API call
  aiForecast: 0.50, // $0.50 per AI forecast/ML prediction
  fraudCheck: 0.75, // $0.75 per fraud detection check
  invoiceGenerated: 1.00, // $1.00 per invoice generated
  reportGenerated: 0.25, // $0.25 per report generated
  dataStorageGB: 0.50, // $0.50 per GB storage per month
};

export default function PricingCalculator() {
  const navigate = useNavigate();
  const [pricingModel, setPricingModel] = useState<"subscription" | "pay-as-you-go" | "hybrid">("subscription");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [userTier, setUserTier] = useState("1-10");
  const [billingFrequency, setBillingFrequency] = useState("monthly");
  
  // Usage estimates for pay-as-you-go model
  const [estimatedUsage, setEstimatedUsage] = useState({
    workOrdersPerMonth: 100,
    apiCallsPerMonth: 1000,
    aiForecastsPerMonth: 50,
    fraudChecksPerMonth: 200,
    invoicesPerMonth: 50,
    reportsPerMonth: 20,
    storageGB: 10,
  });

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const calculatePrice = () => {
    const selectedTier = userTiers.find((t) => t.value === userTier);
    if (!selectedTier) {
      return {
        basePrice: 0,
        moduleBaseCost: 0,
        moduleUserCost: 0,
        usageCost: 0,
        subtotal: 0,
        moduleDiscount: 0,
        moduleDiscountAmount: 0,
        afterModuleDiscount: 0,
        billingDiscount: 0,
        billingDiscountAmount: 0,
        finalPrice: 0,
        userCount: 0,
        selectedModuleCount: 0,
        pricingModel: pricingModel,
      };
    }

    const userCount = selectedTier.count;

    if (pricingModel === "pay-as-you-go") {
      // Pay-as-you-go model: Lower platform fee + usage-based charges
      const basePlatformFee = usageBasedPricing.platformFeePerUser * userCount;
      
      // Calculate usage-based costs
      const usageCost =
        estimatedUsage.workOrdersPerMonth * usageBasedPricing.workOrderProcessed +
        estimatedUsage.apiCallsPerMonth * usageBasedPricing.apiCall +
        estimatedUsage.aiForecastsPerMonth * usageBasedPricing.aiForecast +
        estimatedUsage.fraudChecksPerMonth * usageBasedPricing.fraudCheck +
        estimatedUsage.invoicesPerMonth * usageBasedPricing.invoiceGenerated +
        estimatedUsage.reportsPerMonth * usageBasedPricing.reportGenerated +
        estimatedUsage.storageGB * usageBasedPricing.dataStorageGB;

      const subtotal = basePlatformFee + usageCost;
      
      // Billing frequency discount (smaller discount for pay-as-you-go)
      const billingDiscountRate =
        billingFrequencies.find((b) => b.value === billingFrequency)?.discount || 0;
      const billingDiscountAmount = subtotal * (billingDiscountRate * 0.5); // 50% of subscription discount
      const finalPrice = subtotal - billingDiscountAmount;

      return {
        basePrice: basePlatformFee,
        moduleBaseCost: 0,
        moduleUserCost: 0,
        usageCost: usageCost,
        subtotal,
        moduleDiscount: 0,
        moduleDiscountAmount: 0,
        afterModuleDiscount: subtotal,
        billingDiscount: billingDiscountRate * 0.5,
        billingDiscountAmount,
        finalPrice,
        userCount,
        selectedModuleCount: 0,
        pricingModel: pricingModel,
      };
    } else if (pricingModel === "hybrid") {
      // Hybrid: Subscription for core modules + pay-as-you-go for high-volume operations
      const basePlatformFee = BASE_PLATFORM_FEE_PER_USER * userCount;
      
      // Subscription costs for selected modules
      const selectedModuleAddOns = modules.filter((m) => selectedModules.includes(m.id));
      const moduleBaseCost = selectedModuleAddOns.reduce((sum, m) => sum + m.basePrice, 0);
      const modulePerUserCost = selectedModuleAddOns.reduce((sum, m) => sum + m.perUserPrice, 0);
      const totalModuleUserCost = modulePerUserCost * userCount;
      
      // Usage-based charges for high-volume operations (reduced rates since they have subscription)
      const usageCost =
        estimatedUsage.workOrdersPerMonth * usageBasedPricing.workOrderProcessed * 0.5 + // 50% discount
        estimatedUsage.apiCallsPerMonth * usageBasedPricing.apiCall * 0.7 + // 30% discount
        estimatedUsage.aiForecastsPerMonth * usageBasedPricing.aiForecast * 0.6 + // 40% discount
        estimatedUsage.fraudChecksPerMonth * usageBasedPricing.fraudCheck * 0.6 +
        estimatedUsage.invoicesPerMonth * usageBasedPricing.invoiceGenerated * 0.7 +
        estimatedUsage.reportsPerMonth * usageBasedPricing.reportGenerated * 0.8 +
        estimatedUsage.storageGB * usageBasedPricing.dataStorageGB * 0.5;

      const moduleCosts = moduleBaseCost + totalModuleUserCost;
      let moduleDiscount = 0;
      if (selectedModuleAddOns.length >= 7) moduleDiscount = 0.25;
      else if (selectedModuleAddOns.length >= 5) moduleDiscount = 0.15;
      else if (selectedModuleAddOns.length >= 3) moduleDiscount = 0.1;
      const moduleDiscountAmount = moduleCosts * moduleDiscount;

      const subtotal = basePlatformFee + moduleCosts + usageCost - moduleDiscountAmount;
      
      const billingDiscountRate =
        billingFrequencies.find((b) => b.value === billingFrequency)?.discount || 0;
      const billingDiscountAmount = subtotal * billingDiscountRate;
      const finalPrice = subtotal - billingDiscountAmount;

      return {
        basePrice: basePlatformFee,
        moduleBaseCost: moduleBaseCost,
        moduleUserCost: totalModuleUserCost,
        usageCost: usageCost,
        moduleCosts: moduleCosts,
        subtotal: basePlatformFee + moduleCosts + usageCost,
        moduleDiscount,
        moduleDiscountAmount,
        afterModuleDiscount: subtotal,
        billingDiscount: billingDiscountRate,
        billingDiscountAmount,
        finalPrice,
        userCount,
        selectedModuleCount: selectedModuleAddOns.length,
        pricingModel: pricingModel,
      };
    } else {
      // Standard subscription model
      const basePlatformFee = BASE_PLATFORM_FEE_PER_USER * userCount;

      const selectedModuleAddOns = modules.filter((m) => selectedModules.includes(m.id));
      const moduleBaseCost = selectedModuleAddOns.reduce((sum, m) => sum + m.basePrice, 0);
      const modulePerUserCost = selectedModuleAddOns.reduce((sum, m) => sum + m.perUserPrice, 0);
      const totalModuleUserCost = modulePerUserCost * userCount;

      const subtotal = basePlatformFee + moduleBaseCost + totalModuleUserCost;

      let moduleDiscount = 0;
      if (selectedModuleAddOns.length >= 7) moduleDiscount = 0.25;
      else if (selectedModuleAddOns.length >= 5) moduleDiscount = 0.15;
      else if (selectedModuleAddOns.length >= 3) moduleDiscount = 0.1;

      const moduleCosts = moduleBaseCost + totalModuleUserCost;
      const moduleDiscountAmount = moduleCosts * moduleDiscount;
      const afterModuleDiscount = subtotal - moduleDiscountAmount;

      const billingDiscountRate =
        billingFrequencies.find((b) => b.value === billingFrequency)?.discount || 0;
      const billingDiscountAmount = afterModuleDiscount * billingDiscountRate;
      const finalPrice = afterModuleDiscount - billingDiscountAmount;

      return {
        basePrice: basePlatformFee,
        moduleBaseCost: moduleBaseCost,
        moduleUserCost: totalModuleUserCost,
        usageCost: 0,
        moduleCosts: moduleCosts,
        subtotal,
        moduleDiscount,
        moduleDiscountAmount,
        afterModuleDiscount,
        billingDiscount: billingDiscountRate,
        billingDiscountAmount,
        finalPrice,
        userCount,
        selectedModuleCount: selectedModuleAddOns.length,
        pricingModel: pricingModel,
      };
    }
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
                <CardTitle>Pricing Model</CardTitle>
                <CardDescription>Choose how you want to pay for Guardian Flow</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={pricingModel} onValueChange={(value: any) => setPricingModel(value)}>
                  {pricingModels.map((model) => (
                    <div key={model.value} className="flex items-start space-x-2 mb-4">
                      <RadioGroupItem value={model.value} id={model.value} className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor={model.value} className="cursor-pointer font-medium">
                          {model.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{model.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {(pricingModel === "subscription" || pricingModel === "hybrid") && (
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
                          {module.basePrice > 0 ? `${module.basePrice.toLocaleString()} base + ` : ""}
                          ${module.perUserPrice}/user/month
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

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

            {(pricingModel === "pay-as-you-go" || pricingModel === "hybrid") && (
              <Card>
                <CardHeader>
                  <CardTitle>Estimated Monthly Usage</CardTitle>
                  <CardDescription>Enter your expected monthly usage volumes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="workOrders">Work Orders Processed</Label>
                      <Input
                        id="workOrders"
                        type="number"
                        value={estimatedUsage.workOrdersPerMonth}
                        onChange={(e) => setEstimatedUsage({ ...estimatedUsage, workOrdersPerMonth: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        ${usageBasedPricing.workOrderProcessed} each
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="apiCalls">API Calls</Label>
                      <Input
                        id="apiCalls"
                        type="number"
                        value={estimatedUsage.apiCallsPerMonth}
                        onChange={(e) => setEstimatedUsage({ ...estimatedUsage, apiCallsPerMonth: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        ${usageBasedPricing.apiCall} each
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="aiForecasts">AI Forecasts/Predictions</Label>
                      <Input
                        id="aiForecasts"
                        type="number"
                        value={estimatedUsage.aiForecastsPerMonth}
                        onChange={(e) => setEstimatedUsage({ ...estimatedUsage, aiForecastsPerMonth: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        ${usageBasedPricing.aiForecast} each
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="fraudChecks">Fraud Detection Checks</Label>
                      <Input
                        id="fraudChecks"
                        type="number"
                        value={estimatedUsage.fraudChecksPerMonth}
                        onChange={(e) => setEstimatedUsage({ ...estimatedUsage, fraudChecksPerMonth: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        ${usageBasedPricing.fraudCheck} each
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="invoices">Invoices Generated</Label>
                      <Input
                        id="invoices"
                        type="number"
                        value={estimatedUsage.invoicesPerMonth}
                        onChange={(e) => setEstimatedUsage({ ...estimatedUsage, invoicesPerMonth: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        ${usageBasedPricing.invoiceGenerated} each
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="reports">Reports Generated</Label>
                      <Input
                        id="reports"
                        type="number"
                        value={estimatedUsage.reportsPerMonth}
                        onChange={(e) => setEstimatedUsage({ ...estimatedUsage, reportsPerMonth: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        ${usageBasedPricing.reportGenerated} each
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="storage">Data Storage (GB)</Label>
                      <Input
                        id="storage"
                        type="number"
                        value={estimatedUsage.storageGB}
                        onChange={(e) => setEstimatedUsage({ ...estimatedUsage, storageGB: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        ${usageBasedPricing.dataStorageGB}/GB/month
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                {(selectedModules.length > 0 || userTier !== "1-10" || pricingModel !== "subscription") ? (
                  <>
                    <div className="space-y-2 text-sm">
                      {pricing.basePrice > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Platform Infrastructure ({pricing.userCount} users × ${pricingModel === "pay-as-you-go" ? usageBasedPricing.platformFeePerUser : BASE_PLATFORM_FEE_PER_USER}/user)
                            </span>
                            <span className="font-medium">
                              ${pricing.basePrice.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground ml-2">
                            (Security, Multi-tenancy, RBAC, APIs, Core Platform Services)
                          </div>
                        </>
                      )}
                      {pricing.moduleBaseCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Module Base Fees</span>
                          <span className="font-medium">
                            ${pricing.moduleBaseCost.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {pricing.moduleUserCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Module Per-User ({pricing.userCount} users)
                          </span>
                          <span className="font-medium">
                            ${pricing.moduleUserCost.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {pricing.usageCost > 0 && (
                        <>
                          <div className="border-t pt-2 mt-2">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">Usage-Based Charges</div>
                            <div className="flex justify-between text-xs">
                              <span>Work Orders ({estimatedUsage.workOrdersPerMonth})</span>
                              <span>${(estimatedUsage.workOrdersPerMonth * usageBasedPricing.workOrderProcessed * (pricingModel === "hybrid" ? 0.5 : 1)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>API Calls ({estimatedUsage.apiCallsPerMonth})</span>
                              <span>${(estimatedUsage.apiCallsPerMonth * usageBasedPricing.apiCall * (pricingModel === "hybrid" ? 0.7 : 1)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>AI Forecasts ({estimatedUsage.aiForecastsPerMonth})</span>
                              <span>${(estimatedUsage.aiForecastsPerMonth * usageBasedPricing.aiForecast * (pricingModel === "hybrid" ? 0.6 : 1)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Fraud Checks ({estimatedUsage.fraudChecksPerMonth})</span>
                              <span>${(estimatedUsage.fraudChecksPerMonth * usageBasedPricing.fraudCheck * (pricingModel === "hybrid" ? 0.6 : 1)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Invoices ({estimatedUsage.invoicesPerMonth})</span>
                              <span>${(estimatedUsage.invoicesPerMonth * usageBasedPricing.invoiceGenerated * (pricingModel === "hybrid" ? 0.7 : 1)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Reports ({estimatedUsage.reportsPerMonth})</span>
                              <span>${(estimatedUsage.reportsPerMonth * usageBasedPricing.reportGenerated * (pricingModel === "hybrid" ? 0.8 : 1)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Storage ({estimatedUsage.storageGB} GB)</span>
                              <span>${(estimatedUsage.storageGB * usageBasedPricing.dataStorageGB * (pricingModel === "hybrid" ? 0.5 : 1)).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex justify-between font-medium border-t pt-2">
                            <span>Total Usage Charges</span>
                            <span>${pricing.usageCost.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                      {pricing.moduleDiscount > 0 && (
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                          <span>Multi-Module Discount ({(pricing.moduleDiscount * 100).toFixed(0)}%)</span>
                          <span>-${pricing.moduleDiscountAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      )}
                      {pricing.billingDiscount > 0 && (
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                          <span>Billing Discount ({(pricing.billingDiscount * 100).toFixed(0)}%)</span>
                          <span>-${pricing.billingDiscountAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
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
                            per {billingFrequency === "monthly" ? "month" : billingFrequency === "quarterly" ? "quarter" : billingFrequency === "annual" ? "month" : "month"}
                            {billingFrequency === "annual" && " (billed annually)"}
                            {billingFrequency === "3-year" && " (billed every 3 years)"}
                          </div>
                          {billingFrequency !== "monthly" && (
                            <div className="text-xs text-muted-foreground mt-1">
                              ${(pricing.finalPrice / (billingFrequency === "quarterly" ? 3 : billingFrequency === "annual" ? 12 : 36)).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month equivalent
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => navigate("/auth")}>
                      Get Started
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-2">Select modules and user count to see pricing</p>
                    <p className="text-xs">Base platform fee covers infrastructure - select modules as add-ons</p>
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
