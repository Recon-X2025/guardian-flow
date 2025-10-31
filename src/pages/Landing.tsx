import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Wrench,
  BarChart3,
  Calendar,
  Shield,
  ShoppingBag,
  PieChart,
  Users,
  Video,
  ArrowRight,
  Twitter,
  Linkedin,
  Mail,
} from "lucide-react";

const modules = [
  {
    id: "field-service",
    icon: Wrench,
    title: "Field Service Management",
    description: "Complete work order lifecycle management with real-time dispatch, technician tracking, and mobile-first execution capabilities.",
    path: "/modules/field-service",
  },
  {
    id: "asset-lifecycle",
    icon: BarChart3,
    title: "Asset Lifecycle Management",
    description: "Track equipment from procurement through retirement with predictive maintenance, warranty management, and compliance tracking.",
    path: "/modules/asset-lifecycle",
  },
  {
    id: "ai-forecasting",
    icon: Calendar,
    title: "AI Forecasting & Scheduling",
    description: "Machine learning-powered demand forecasting, dynamic scheduling, and route optimization to maximize operational efficiency.",
    path: "/modules/ai-forecasting",
  },
  {
    id: "fraud-compliance",
    icon: Shield,
    title: "Fraud Detection & Compliance",
    description: "Advanced image forgery detection, anomaly monitoring, and automated compliance reporting to protect your operations.",
    path: "/modules/fraud-compliance",
  },
  {
    id: "marketplace",
    icon: ShoppingBag,
    title: "Marketplace & Extensions",
    description: "Extend platform capabilities with pre-built integrations, industry-specific workflows, and custom extensions.",
    path: "/modules/marketplace",
  },
  {
    id: "analytics-bi",
    icon: PieChart,
    title: "Analytics & BI Integration",
    description: "Real-time operational dashboards, financial analytics, and seamless integration with your existing BI tools.",
    path: "/modules/analytics-bi",
  },
  {
    id: "customer-portal",
    icon: Users,
    title: "Customer Portal",
    description: "Self-service portal enabling customers to book services, track orders, and manage their account independently.",
    path: "/modules/customer-portal",
  },
  {
    id: "video-training",
    icon: Video,
    title: "Video Training & Knowledge Base",
    description: "Comprehensive training resources, video tutorials, and AI-powered knowledge base for rapid team onboarding.",
    path: "/modules/video-training",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-gradient-to-br from-primary to-accent" />
            <span className="text-xl font-bold">Guardian Flow</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Empowering AI-Driven Enterprise Operations Across Industries
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground">
              From Field Service to Asset Lifecycle Management — One Unified Platform
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document.getElementById("offerings")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Offerings Section */}
      <section id="offerings" className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Platform Modules</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Comprehensive solutions tailored to your industry needs
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Card
                  key={module.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                  onClick={() => navigate(module.path)}
                >
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{module.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {module.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full justify-between group">
                      Learn More
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Transparent Pricing</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Flexible bundles and modular pricing to fit your organization
            </p>
          </div>

          {/* Pricing Tiers */}
          <div className="grid gap-8 lg:grid-cols-3 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <CardDescription>Essential field service capabilities</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$2,500</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Field Service Management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Customer Portal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Basic Analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Up to 50 active users</span>
                  </li>
                </ul>
                <Button className="w-full" onClick={() => navigate("/auth")}>
                  Get Started
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary shadow-lg">
              <CardHeader>
                <div className="inline-block px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full mb-2">
                  Most Popular
                </div>
                <CardTitle className="text-2xl">Professional</CardTitle>
                <CardDescription>Complete operational suite</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$6,000</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>All Starter features</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Asset Lifecycle Management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>AI Forecasting & Scheduling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Advanced Analytics & BI</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Up to 200 active users</span>
                  </li>
                </ul>
                <Button className="w-full" onClick={() => navigate("/auth")}>
                  Get Started
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <CardDescription>Full platform with all capabilities</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$12,000</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>All Professional features</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Fraud Detection & Compliance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Marketplace & Extensions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>White-label options</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Unlimited users</span>
                  </li>
                </ul>
                <Button className="w-full" onClick={() => navigate("/auth")}>
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Details */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>Flexible Pricing Options</CardTitle>
              <CardDescription>
                Additional modules and volume discounts available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Multi-Module Discounts</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• 3-4 modules: 10% discount</li>
                    <li>• 5-6 modules: 15% discount</li>
                    <li>• 7+ modules: 25% discount</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Billing Frequency Discounts</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Quarterly: 5-7% discount</li>
                    <li>• Annual: 15-20% discount</li>
                    <li>• 3-year: 25-30% discount</li>
                  </ul>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/pricing-calculator")}
              >
                Build Custom Bundle
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-accent/10 to-background">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Transform Your Operations?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join leading enterprises already using Guardian Flow to streamline their field service
              operations
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/contact")}>
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-card">
        <div className="container">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded bg-gradient-to-br from-primary to-accent" />
                <span className="font-bold">Guardian Flow</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Enterprise field service management platform powered by AI
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#offerings" className="hover:text-foreground transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-foreground transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="/developer" className="hover:text-foreground transition-colors">
                    Developer API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/contact" className="hover:text-foreground transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex gap-4">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  href="mailto:contact@guardianflow.com"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Guardian Flow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
