import { Button } from "@/components/ui/button";
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
  Check,
  Sparkles,
  ChevronRight,
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
    <div className="min-h-screen" style={{ background: '#0B1120' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur-xl" style={{ background: 'rgba(11, 17, 32, 0.9)' }}>
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 50%, #2563EB 100%)' }}>
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">
              Guardian Flow
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              asChild
              className="text-slate-300 hover:text-white hover:bg-white/10"
            >
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button
              asChild
              className="font-semibold text-white hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 50%, #2563EB 100%)' }}
            >
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] opacity-30" style={{ background: '#7C3AED' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] opacity-20" style={{ background: '#2563EB' }} />

        <div className="container relative px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-sm mb-8" style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8' }}>
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#7C3AED' }} />
              AI-Powered Enterprise Platform
            </div>
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl leading-tight text-white">
              Build the{" "}
              <span className="text-gradient">Future</span>
              {" "}of Field Service
            </h1>
            <p className="mt-6 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: '#94A3B8' }}>
              A unified platform designed to streamline operations, ensure compliance, and fuel innovation—tailored to your industry's unique challenges and ambitions.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="gap-2 font-semibold text-white hover:opacity-90 transition-all px-8 py-6 text-lg"
                style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 50%, #2563EB 100%)' }}
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById("industries")?.scrollIntoView({ behavior: "smooth" })}
                className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg"
              >
                Explore Platform
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-gradient">87+</div>
                <div className="text-sm mt-1" style={{ color: '#64748B' }}>Integrated Modules</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-gradient">99.9%</div>
                <div className="text-sm mt-1" style={{ color: '#64748B' }}>Uptime SLA</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-gradient">6+</div>
                <div className="text-sm mt-1" style={{ color: '#64748B' }}>Industries Served</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-24 relative" style={{ background: '#0F172A' }}>
        <div className="container relative px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-4 text-white">
              Trusted Across{" "}
              <span className="text-gradient">Industries</span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#94A3B8' }}>
              Discover how Guardian Flow delivers operational excellence tailored to your sector
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {industries.map((industry) => {
              const Icon = industry.icon;
              return (
                <div
                  key={industry.id}
                  className="group relative overflow-hidden rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-purple-500/50"
                  style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="h-14 w-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.2))' }}
                  >
                    <Icon className="h-7 w-7" style={{ color: '#8B5CF6' }} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{industry.title}</h3>
                  <ul className="space-y-3">
                    {industry.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm transition-colors" style={{ color: '#94A3B8' }}>
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="offerings" className="py-24 relative" style={{ background: '#0B1120' }}>
        <div className="container px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-4 text-white">
              Platform{" "}
              <span className="text-gradient">Modules</span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#94A3B8' }}>
              Comprehensive solutions tailored to your industry needs
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.id}
                  onClick={() => navigate(module.path)}
                  className="group relative overflow-hidden rounded-xl p-6 cursor-pointer transition-all duration-300 hover:translate-y-[-4px]"
                  style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-all"
                    style={{ background: 'rgba(124,58,237,0.15)' }}
                  >
                    <Icon className="h-6 w-6" style={{ color: '#8B5CF6' }} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{module.title}</h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#94A3B8' }}>
                    {module.description}
                  </p>
                  <div className="flex items-center text-sm font-medium" style={{ color: '#8B5CF6' }}>
                    Learn More
                    <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative" style={{ background: '#0F172A' }}>
        <div className="container relative px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-4 text-white">
              Transparent{" "}
              <span className="text-gradient">Pricing</span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#94A3B8' }}>
              Flexible bundles and modular pricing to fit your organization
            </p>
          </div>

          {/* Pricing Tiers */}
          <div className="grid gap-8 lg:grid-cols-3 mb-12 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="rounded-xl p-8 transition-all" style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
              <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>Essential field service capabilities</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$2,500</span>
                <span style={{ color: '#64748B' }}>/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Field Service Management", "Customer Portal", "Basic Analytics", "Up to 50 active users"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm" style={{ color: '#CBD5E1' }}>
                    <Check className="h-4 w-4 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full text-white"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={() => navigate("/auth")}
              >
                Get Started
              </Button>
            </div>

            {/* Professional */}
            <div
              className="rounded-xl p-8 relative"
              style={{
                background: 'linear-gradient(180deg, rgba(124,58,237,0.15) 0%, #1E293B 100%)',
                border: '1px solid rgba(124,58,237,0.3)',
                boxShadow: '0 0 40px rgba(124,58,237,0.15)'
              }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span
                  className="px-4 py-1 text-xs font-semibold text-white rounded-full"
                  style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)' }}
                >
                  Most Popular
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
              <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>Complete operational suite</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$6,000</span>
                <span style={{ color: '#64748B' }}>/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["All Starter features", "Asset Lifecycle Management", "AI Forecasting & Scheduling", "Advanced Analytics & BI", "Up to 200 active users"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm" style={{ color: '#CBD5E1' }}>
                    <Check className="h-4 w-4 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 50%, #2563EB 100%)' }}
                onClick={() => navigate("/auth")}
              >
                Get Started
              </Button>
            </div>

            {/* Enterprise */}
            <div className="rounded-xl p-8 transition-all" style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
              <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>Full platform with all capabilities</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$12,000</span>
                <span style={{ color: '#64748B' }}>/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["All Professional features", "Fraud Detection & Compliance", "Marketplace & Extensions", "White-label options", "Unlimited users"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm" style={{ color: '#CBD5E1' }}>
                    <Check className="h-4 w-4 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full text-white"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={() => navigate("/auth")}
              >
                Contact Sales
              </Button>
            </div>
          </div>

          {/* Pricing Details */}
          <div className="max-w-3xl mx-auto rounded-xl p-8" style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-xl font-semibold text-white mb-4">Flexible Pricing Options</h3>
            <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>Additional modules and volume discounts available</p>
            <div className="grid sm:grid-cols-2 gap-6 text-sm mb-6">
              <div>
                <h4 className="font-semibold text-white mb-2">Multi-Module Discounts</h4>
                <ul className="space-y-1" style={{ color: '#94A3B8' }}>
                  <li>3-4 modules: 10% discount</li>
                  <li>5-6 modules: 15% discount</li>
                  <li>7+ modules: 25% discount</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Billing Frequency Discounts</h4>
                <ul className="space-y-1" style={{ color: '#94A3B8' }}>
                  <li>Quarterly: 5-7% discount</li>
                  <li>Annual: 15-20% discount</li>
                  <li>3-year: 25-30% discount</li>
                </ul>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
              onClick={() => navigate("/pricing-calculator")}
            >
              Build Custom Bundle
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden" style={{ background: '#0B1120' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-[100px] opacity-30" style={{ background: '#7C3AED' }} />
        <div className="container relative px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-4 text-white">
              Ready to{" "}
              <span className="text-gradient">Transform</span>{" "}
              Your Operations?
            </h2>
            <p className="text-lg mb-8" style={{ color: '#94A3B8' }}>
              Join leading enterprises already using Guardian Flow to streamline their field service operations
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="gap-2 font-semibold text-white hover:opacity-90 transition-all px-8"
                style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 50%, #2563EB 100%)' }}
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/contact")}
                className="border-white/20 text-white hover:bg-white/10 px-8"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12" style={{ background: '#0B1120' }}>
        <div className="container px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 50%, #2563EB 100%)' }}
                >
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-white">Guardian Flow</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
                A versatile, AI-powered enterprise platform that goes beyond field service management to deliver comprehensive operational excellence across industries worldwide.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#64748B' }}>
                <li><a href="#offerings" className="hover:text-purple-400 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-purple-400 transition-colors">Pricing</a></li>
                <li><a href="/developer" className="hover:text-purple-400 transition-colors">Developer API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#64748B' }}>
                <li><a href="/privacy" className="hover:text-purple-400 transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-purple-400 transition-colors">Terms of Service</a></li>
                <li><a href="/contact" className="hover:text-purple-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Connect</h4>
              <div className="flex gap-4">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors" style={{ color: '#64748B' }}>
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors" style={{ color: '#64748B' }}>
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="mailto:contact@guardianflow.com" className="hover:text-purple-400 transition-colors" style={{ color: '#64748B' }}>
                  <Mail className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm" style={{ color: '#475569' }}>
            © {new Date().getFullYear()} Guardian Flow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
