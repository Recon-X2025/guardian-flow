import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
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
  Activity,
  Factory,
  Zap,
  Truck,
  Building2,
  Store,
  Database,
} from "lucide-react";

const industries = [
  {
    id: "healthcare",
    icon: Activity,
    title: "Healthcare",
    benefits: [
      "Predictive maintenance for critical medical equipment",
      "Automated regulatory compliance and audit trails",
      "Secure, role-based access for sensitive data",
    ],
  },
  {
    id: "manufacturing",
    icon: Factory,
    title: "Manufacturing",
    benefits: [
      "Real-time asset monitoring and fault detection",
      "Automated safety and environmental compliance",
      "Modular workflows optimized for varied processes",
    ],
  },
  {
    id: "utilities",
    icon: Zap,
    title: "Utilities & Energy",
    benefits: [
      "Distributed asset and workforce management",
      "AI-powered fault detection and rapid dispatch",
      "Regulatory adherence and multi-agency support",
    ],
  },
  {
    id: "logistics",
    icon: Truck,
    title: "Logistics & Transportation",
    benefits: [
      "Fleet maintenance and driver compliance coordination",
      "Predictive analytics for route & asset optimization",
      "SLA monitoring with real-time operational visibility",
    ],
  },
  {
    id: "finance",
    icon: Building2,
    title: "Finance & Insurance",
    benefits: [
      "Automated claims inspection and workflow AI",
      "Financial regulation compliance and audit readiness",
      "AI-driven fraud detection and risk management",
    ],
  },
  {
    id: "retail",
    icon: Store,
    title: "Retail & Supply Chain",
    benefits: [
      "Equipment maintenance and vendor coordination",
      "Real-time inventory and operational analytics",
      "Scalable platform for multi-site deployment",
    ],
  },
];

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
  {
    id: "analytics-platform",
    icon: Database,
    title: "Enterprise Analytics Platform",
    description: "Secure, scalable data analytics with ML orchestration, data quality validation, anomaly detection, and SOC2/ISO27001 compliance.",
    path: "/modules/analytics-platform",
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
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Empowering AI-Driven Transformation Across Every Industry
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              A unified platform designed to streamline operations, ensure compliance, and fuel innovation—tailored to your industry's unique challenges and ambitions.
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
                  document.getElementById("industries")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Explore Industries
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-20 bg-gradient-to-br from-muted/30 to-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Trusted Across Industries
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover how Guardian Flow delivers operational excellence tailored to your sector
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {industries.map((industry) => {
              const Icon = industry.icon;
              return (
                <Card
                  key={industry.id}
                  className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-2 hover:border-primary/50"
                >
                  <CardHeader className="pb-4">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{industry.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {industry.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </Card>
              );
            })}
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
              Unified platform infrastructure + modular add-ons. Pay only for what you need.
            </p>
          </div>

          {/* Pricing Tiers - Good-Better-Best Model */}
          <div className="grid gap-8 lg:grid-cols-4 mb-12">
            {/* Starter - Good */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <CardDescription>Core features for small teams</CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$12</span>
                    <span className="text-muted-foreground text-sm">/user/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Perfect for small teams and pilots</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">CORE FEATURES</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Platform infrastructure ($12/user)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Basic modules available as add-ons</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Email support</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Standard security & RBAC</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">MODULES</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Pay-per-module pricing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Pay-as-you-go options</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Ideal for:</p>
                  <p className="text-xs">Small teams (1-25 users), pilot projects, testing</p>
                </div>
                <Button className="w-full" onClick={() => navigate("/pricing-calculator")}>
                  Calculate Price
                </Button>
              </CardContent>
            </Card>

            {/* Professional - Better (Most Popular) */}
            <Card className="border-primary shadow-lg">
              <CardHeader>
                <div className="inline-block px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full mb-2">
                  Most Popular
                </div>
                <CardTitle className="text-2xl">Professional</CardTitle>
                <CardDescription>Advanced capabilities for growing businesses</CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$25</span>
                    <span className="text-muted-foreground text-sm">/user/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Best value for growing teams</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">INCLUDES EVERYTHING IN STARTER</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Platform infrastructure ($12/user)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>+ Additional $13/user for advanced modules</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Priority email support</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Multi-module discounts</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Advanced analytics & reporting</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Ideal for:</p>
                  <p className="text-xs">Growing businesses (26-200 users), established operations</p>
                </div>
                <Button className="w-full" onClick={() => navigate("/pricing-calculator")}>
                  Calculate Price
                </Button>
              </CardContent>
            </Card>

            {/* Business - Best */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Business</CardTitle>
                <CardDescription>Complete enterprise operations suite</CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$50</span>
                    <span className="text-muted-foreground text-sm">/user/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Comprehensive solution for established companies</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">INCLUDES EVERYTHING IN PROFESSIONAL</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Platform infrastructure ($12/user)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>+ Advanced modules included</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Phone + email support</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Full compliance & audit features</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Volume discounts available</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Custom integrations support</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Ideal for:</p>
                  <p className="text-xs">Established companies (201-500 users), multi-module needs</p>
                </div>
                <Button className="w-full" onClick={() => navigate("/pricing-calculator")}>
                  Calculate Price
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise - Custom */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <CardDescription>Fully customized operations platform</CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">From $150</span>
                    <span className="text-muted-foreground text-sm">/user/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Custom pricing with volume discounts</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">INCLUDES EVERYTHING IN BUSINESS</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>All modules included</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>White-label & private deployment options</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Dedicated support & SLA guarantees</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Custom integrations & workflows</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Advanced compliance packages</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Volume discounts for 500+ users</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Ideal for:</p>
                  <p className="text-xs">Large enterprises (500+ users) with unique requirements and compliance needs</p>
                </div>
                <Button className="w-full" onClick={() => navigate("/pricing-calculator")}>
                  Calculate Price
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full mt-2" 
                  onClick={() => navigate("/contact")}
                >
                  Contact Sales for Custom Quote
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Details */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>Flexible Pricing Models</CardTitle>
              <CardDescription>
                Choose the pricing model that works best for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Subscription Model</h4>
                  <p className="text-muted-foreground mb-2">
                    Fixed monthly fee per user. Best for predictable usage.
                  </p>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• Platform: $15/user/month</li>
                    <li>• Modules: Base + per-user pricing</li>
                    <li>• Predictable monthly costs</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Pay-As-You-Go</h4>
                  <p className="text-muted-foreground mb-2">
                    Pay only for operations you use. Best for variable workloads.
                  </p>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• Platform: $5/user/month</li>
                    <li>• Usage-based charges</li>
                    <li>• Scale with your operations</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Hybrid Model</h4>
                  <p className="text-muted-foreground mb-2">
                    Combine subscriptions + usage. Best for mixed workloads.
                  </p>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• Core modules: Subscription</li>
                    <li>• High-volume ops: Pay-per-use</li>
                    <li>• Discounted usage rates</li>
                  </ul>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-sm pt-4 border-t">
                <div>
                  <h4 className="font-semibold mb-2">Volume Discounts</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Multi-module: Up to 25% discount</li>
                    <li>• Annual billing: Up to 18% discount</li>
                    <li>• Enterprise: Custom pricing</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">All Modules Available</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Field Service Management</li>
                    <li>• Asset Lifecycle Management</li>
                    <li>• AI Forecasting & Scheduling</li>
                    <li>• Fraud Detection & Compliance</li>
                    <li>• And more...</li>
                  </ul>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/pricing-calculator")}
              >
                Use Pricing Calculator
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
                A versatile, AI-powered enterprise platform that goes beyond field service management to deliver comprehensive operational excellence across industries worldwide.
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
