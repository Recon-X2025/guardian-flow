import { 
  Shield, 
  Factory, 
  Package, 
  Brain, 
  ShoppingBag, 
  BarChart3, 
  Users, 
  Video, 
  FileSearch,
  type LucideIcon
} from "lucide-react";

export type ModuleId = 
  | "platform" 
  | "fsm" 
  | "asset" 
  | "forecasting" 
  | "fraud" 
  | "marketplace" 
  | "analytics" 
  | "customer" 
  | "training" 
  | "forensics";

export type AuthBrandingConfig = {
  module: ModuleId;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  primaryColor: string;
  gradientFrom: string;
  gradientTo: string;
  allowSSO: boolean;
  allowMFA: boolean;
  allowPasswordless: boolean;
  complianceMessage?: string;
  supportEmail?: string;
  supportPhone?: string;
  helpUrl?: string;
  legalNotice?: string;
};

export const AUTH_MODULES: Record<ModuleId, AuthBrandingConfig> = {
  platform: {
    module: "platform",
    name: "Guardian Flow",
    tagline: "Enterprise Operations & Intelligence Platform",
    description: "Modular suite for field service, asset lifecycle, compliance, forecasting, analytics, fraud forensics, and more.",
    icon: Shield,
    primaryColor: "hsl(222, 47%, 11%)",
    gradientFrom: "from-blue-600",
    gradientTo: "to-indigo-700",
    allowSSO: true,
    allowMFA: true,
    allowPasswordless: true,
    supportEmail: "support@guardianflow.com",
    helpUrl: "https://docs.guardianflow.com"
  },
  
  fsm: {
    module: "fsm",
    name: "Field Service Management",
    tagline: "Intelligent Work Order & Dispatch Platform",
    description: "Streamline technician scheduling, work order management, and field operations with real-time tracking and mobile capabilities.",
    icon: Factory,
    primaryColor: "hsl(217, 91%, 60%)",
    gradientFrom: "from-blue-500",
    gradientTo: "to-cyan-600",
    allowSSO: true,
    allowMFA: true,
    allowPasswordless: true,
    supportEmail: "fsm-support@guardianflow.com"
  },
  
  asset: {
    module: "asset",
    name: "Asset Lifecycle Management",
    tagline: "Complete Asset Tracking & Maintenance",
    description: "Track assets from procurement to decommissioning with automated maintenance scheduling, warranty management, and compliance reporting.",
    icon: Package,
    primaryColor: "hsl(142, 71%, 45%)",
    gradientFrom: "from-green-500",
    gradientTo: "to-emerald-600",
    allowSSO: true,
    allowMFA: true,
    allowPasswordless: false,
    supportEmail: "asset-support@guardianflow.com"
  },
  
  forecasting: {
    module: "forecasting",
    name: "AI Forecasting & Scheduling",
    tagline: "Predictive Intelligence for Operations",
    description: "Machine learning-powered demand forecasting, workforce optimization, and intelligent scheduling with route optimization.",
    icon: Brain,
    primaryColor: "hsl(271, 76%, 53%)",
    gradientFrom: "from-purple-500",
    gradientTo: "to-fuchsia-600",
    allowSSO: true,
    allowMFA: true,
    allowPasswordless: false,
    supportEmail: "forecast-support@guardianflow.com"
  },
  
  fraud: {
    module: "fraud",
    name: "Fraud Detection & Compliance",
    tagline: "Advanced Forensics & Risk Management",
    description: "AI-powered fraud detection with image forensics, anomaly detection, and automated compliance monitoring for SOC2, HIPAA, GDPR, and ISO27001.",
    icon: FileSearch,
    primaryColor: "hsl(0, 84%, 60%)",
    gradientFrom: "from-red-500",
    gradientTo: "to-orange-600",
    allowSSO: true,
    allowMFA: true,
    allowPasswordless: false,
    complianceMessage: "This module handles sensitive security data. Multi-factor authentication is required.",
    supportEmail: "security@guardianflow.com"
  },
  
  marketplace: {
    module: "marketplace",
    name: "Extension Marketplace",
    tagline: "Expand Your Platform Capabilities",
    description: "Browse, install, and manage extensions to customize Guardian Flow for your unique business needs.",
    icon: ShoppingBag,
    primaryColor: "hsl(280, 89%, 63%)",
    gradientFrom: "from-pink-500",
    gradientTo: "to-purple-600",
    allowSSO: true,
    allowMFA: false,
    allowPasswordless: true,
    supportEmail: "marketplace@guardianflow.com"
  },
  
  analytics: {
    module: "analytics",
    name: "Enterprise Analytics Platform",
    tagline: "Data-Driven Insights & Intelligence",
    description: "Advanced analytics, BI integration, ML model orchestration, and real-time dashboards for strategic decision-making.",
    icon: BarChart3,
    primaryColor: "hsl(199, 89%, 48%)",
    gradientFrom: "from-cyan-500",
    gradientTo: "to-blue-600",
    allowSSO: true,
    allowMFA: true,
    allowPasswordless: false,
    supportEmail: "analytics@guardianflow.com"
  },
  
  customer: {
    module: "customer",
    name: "Customer Portal",
    tagline: "Self-Service Excellence",
    description: "Empower customers with real-time service tracking, payment management, and direct communication capabilities.",
    icon: Users,
    primaryColor: "hsl(173, 58%, 39%)",
    gradientFrom: "from-teal-500",
    gradientTo: "to-green-600",
    allowSSO: false,
    allowMFA: false,
    allowPasswordless: true,
    supportEmail: "customer-support@guardianflow.com"
  },
  
  training: {
    module: "training",
    name: "Video Training & Knowledge Base",
    tagline: "Learn, Grow, Certify",
    description: "Comprehensive training platform with video courses, knowledge articles, AI recommendations, and certification tracking.",
    icon: Video,
    primaryColor: "hsl(24, 95%, 53%)",
    gradientFrom: "from-orange-500",
    gradientTo: "to-yellow-600",
    allowSSO: true,
    allowMFA: false,
    allowPasswordless: true,
    supportEmail: "training@guardianflow.com"
  },
  
  forensics: {
    module: "forensics",
    name: "Image Forensics & Investigation",
    tagline: "Advanced Image Authentication",
    description: "AI-powered image forgery detection, metadata analysis, and tamper detection with immutable evidence management.",
    icon: FileSearch,
    primaryColor: "hsl(340, 82%, 52%)",
    gradientFrom: "from-rose-500",
    gradientTo: "to-red-600",
    allowSSO: true,
    allowMFA: true,
    allowPasswordless: false,
    complianceMessage: "Forensic evidence requires secure authentication and audit trails.",
    supportEmail: "forensics@guardianflow.com"
  }
};

export type WhiteLabelConfig = {
  enabled: boolean;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  termsUrl?: string;
  privacyUrl?: string;
  helpUrl?: string;
};

export const getAuthConfig = (moduleId: ModuleId, whiteLabel?: WhiteLabelConfig): AuthBrandingConfig => {
  const baseConfig = AUTH_MODULES[moduleId];
  
  if (!whiteLabel?.enabled) {
    return baseConfig;
  }
  
  return {
    ...baseConfig,
    name: whiteLabel.companyName || baseConfig.name,
    primaryColor: whiteLabel.primaryColor || baseConfig.primaryColor,
    supportEmail: whiteLabel.supportEmail || baseConfig.supportEmail,
    supportPhone: whiteLabel.supportPhone,
    helpUrl: whiteLabel.helpUrl || baseConfig.helpUrl,
    legalNotice: whiteLabel.termsUrl ? `By signing in, you agree to the Terms of Service and Privacy Policy.` : undefined
  };
};
