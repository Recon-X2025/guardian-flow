import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Building2, Factory, Zap, Store, Truck, Home, Server, HardHat, HeartPulse } from "lucide-react";

type Industry = {
  id: string;
  name: string;
  description: string;
  icon: typeof Factory;
  color: string;
};

const industries: Industry[] = [
  {
    id: "manufacturing",
    name: "Manufacturing",
    description: "Production facilities, equipment maintenance, quality control",
    icon: Factory,
    color: "text-blue-500"
  },
  {
    id: "telecom",
    name: "Telecommunications",
    description: "Network infrastructure, tower maintenance, field installations",
    icon: Server,
    color: "text-purple-500"
  },
  {
    id: "energy",
    name: "Energy & Utilities",
    description: "Power generation, grid maintenance, renewable energy",
    icon: Zap,
    color: "text-yellow-500"
  },
  {
    id: "retail",
    name: "Retail",
    description: "Store maintenance, POS systems, facility management",
    icon: Store,
    color: "text-pink-500"
  },
  {
    id: "logistics",
    name: "Logistics & Transportation",
    description: "Fleet management, warehouse operations, delivery optimization",
    icon: Truck,
    color: "text-orange-500"
  },
  {
    id: "facility",
    name: "Facility Management",
    description: "Building maintenance, HVAC, security systems",
    icon: Home,
    color: "text-green-500"
  },
  {
    id: "it_services",
    name: "IT Services",
    description: "Hardware support, network administration, help desk",
    icon: Server,
    color: "text-indigo-500"
  },
  {
    id: "construction",
    name: "Construction",
    description: "Project management, equipment tracking, safety compliance",
    icon: HardHat,
    color: "text-amber-500"
  },
  {
    id: "healthcare",
    name: "Healthcare",
    description: "Medical equipment, facility services, compliance tracking",
    icon: HeartPulse,
    color: "text-red-500"
  }
];

export default function IndustryOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleIndustrySelect = (industryId: string) => {
    setSelectedIndustry(industryId);
  };

  const handleNext = () => {
    if (!selectedIndustry) {
      toast.error("Please select an industry");
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    if (!companyName.trim()) {
      toast.error("Please enter your company name");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update tenant with industry configuration
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) throw new Error("No tenant found");

      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          industry_type: selectedIndustry,
          name: companyName
        })
        .eq("id", profile.tenant_id);

      if (tenantError) throw tenantError;

      // Create industry-specific workflow templates
      await supabase.functions.invoke("setup-industry-workflows", {
        body: { 
          tenantId: profile.tenant_id, 
          industry: selectedIndustry 
        }
      });

      toast.success("Onboarding complete! Welcome to Guardian Flow");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6 flex items-center justify-center">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="text-3xl">Welcome to Guardian Flow</CardTitle>
            <CardDescription className="text-lg">
              Let's customize your experience. Select your industry to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedIndustry} onValueChange={handleIndustrySelect}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {industries.map((industry) => {
                  const Icon = industry.icon;
                  return (
                    <label
                      key={industry.id}
                      className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary ${
                        selectedIndustry === industry.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <RadioGroupItem
                        value={industry.id}
                        id={industry.id}
                        className="sr-only"
                      />
                      <div className="flex items-start gap-3">
                        <Icon className={`w-6 h-6 mt-1 ${industry.color}`} />
                        <div className="flex-1">
                          <div className="font-semibold mb-1">{industry.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {industry.description}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleNext} size="lg">
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>
            Tell us a bit about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
              className="mt-1"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Setting up..." : "Complete Setup"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
