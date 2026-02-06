import { NavLink, useLocation } from "react-router-dom";
import {
  Wrench,
  Clipboard,
  Camera,
  Calendar,
  MapPin,
  Package,
  ShoppingCart,
  Shield,
  FileText,
  CreditCard,
  BookOpen,
  Bot,
  MessageSquare,
  FileCheck,
  Brain,
  AlertTriangle,
  ShieldAlert,
  Activity,
  TrendingUp,
  Receipt,
  DollarSign,
  Home,
  Sparkles,
  Eye,
  Settings,
  GraduationCap,
  Route,
  Heart,
  Store,
  BarChart3,
  Workflow,
  Code2,
  Users,
  HardHat,
  Cog,
  Globe,
  Handshake,
  ClipboardList,
  CalendarClock,
  Gauge,
  Search,
  Layers,
  Webhook,
  Scale,
  FlaskConical,
  HelpCircle,
  Cpu,
  ScrollText,
  FileBarChart,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { useRBAC, type AppRole } from "@/domains/auth/contexts/RBACContext";
import { useAuth } from "@/domains/auth/contexts/AuthContext";
import { MODULE_RELEVANT_ROLES, type AuthModule } from "@/domains/auth/lib/authRedirects";
import { apiClient } from "@/integrations/api/client";
import { LucideIcon } from "lucide-react";

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  permissions?: string[];
  roles?: string[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "Core",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: Home },
      { title: "Tickets", url: "/tickets", icon: Clipboard, permissions: ["ticket.read"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher","technician","support_agent"] },
      { title: "Work Orders", url: "/work-orders", icon: Wrench, permissions: ["wo.read"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher","technician","partner_admin"] },
      { title: "Service Orders", url: "/service-orders", icon: FileCheck, permissions: ["so.view"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher","technician"] },
      { title: "Customers", url: "/customers", icon: Users, permissions: ["customers.view"], roles: ["sys_admin","tenant_admin","ops_manager","support_agent"] },
      { title: "Technicians", url: "/technicians", icon: HardHat, permissions: ["technicians.view"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher"] },
      { title: "Equipment", url: "/equipment", icon: Cog, permissions: ["equipment.view"], roles: ["sys_admin","tenant_admin","ops_manager","technician","partner_admin"] },
      { title: "Contracts", url: "/contracts", icon: ScrollText, permissions: ["contracts.view"], roles: ["sys_admin","tenant_admin","finance_manager"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Pending Validation", url: "/pending-validation", icon: AlertTriangle, permissions: ["wo.read"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher"] },
      { title: "Scheduler", url: "/scheduler", icon: Calendar, permissions: ["wo.assign"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher"] },
      { title: "Schedule Optimizer", url: "/schedule-optimizer", icon: CalendarClock, permissions: ["wo.assign"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher"] },
      { title: "Maintenance Calendar", url: "/maintenance-calendar", icon: Calendar, permissions: ["wo.assign"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher"] },
      { title: "Dispatch", url: "/dispatch", icon: MapPin, permissions: ["wo.assign"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher"] },
      { title: "Route Optimization", url: "/route-optimization", icon: Route, permissions: ["wo.assign"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher"] },
      { title: "Predictive Maintenance", url: "/predictive-maintenance", icon: Gauge, permissions: ["maintenance.view"], roles: ["sys_admin","tenant_admin","ops_manager"] },
      { title: "Inventory", url: "/inventory", icon: Package, permissions: ["inventory.view"], roles: ["sys_admin","tenant_admin","ops_manager","partner_admin"] },
      { title: "Procurement", url: "/procurement", icon: ShoppingCart, permissions: ["inventory.procure"], roles: ["sys_admin","tenant_admin","ops_manager"] },
      { title: "Warranty & RMA", url: "/warranty", icon: Shield, permissions: ["warranty.view"], roles: ["sys_admin","tenant_admin","ops_manager","support_agent"] },
      { title: "Photo Capture", url: "/photo-capture", icon: Camera, permissions: ["attachment.upload"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher","technician"] },
    ],
  },
  {
    label: "Financial",
    items: [
      { title: "Finance", url: "/finance", icon: DollarSign, permissions: ["finance.view"], roles: ["sys_admin","tenant_admin","finance_manager"] },
      { title: "Quotes", url: "/quotes", icon: FileText, permissions: ["quote.view"], roles: ["sys_admin","tenant_admin","finance_manager"] },
      { title: "Invoicing", url: "/invoicing", icon: Receipt, permissions: ["invoice.view"], roles: ["sys_admin","tenant_admin","finance_manager"] },
      { title: "Payments", url: "/payments", icon: CreditCard, permissions: ["invoice.pay"], roles: ["sys_admin","tenant_admin","finance_manager"] },
      { title: "Penalties", url: "/penalties", icon: AlertTriangle, permissions: ["penalty.calculate"], roles: ["sys_admin","tenant_admin","finance_manager"] },
      { title: "Disputes", url: "/disputes", icon: Scale, permissions: ["finance.view"], roles: ["sys_admin","tenant_admin","finance_manager"] },
      { title: "Pricing Calculator", url: "/pricing-calculator", icon: DollarSign },
    ],
  },
  {
    label: "AI & Automation",
    items: [
      { title: "Offer AI", url: "/sapos", icon: Sparkles, permissions: ["sapos.view"] },
      { title: "Agent Dashboard", url: "/agent-dashboard", icon: Bot, permissions: ["admin.config"] },
      { title: "NLP Query", url: "/nlp-query", icon: Search, permissions: ["admin.config"] },
      { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen, permissions: ["admin.config"] },
      { title: "FAQ", url: "/faq", icon: HelpCircle },
      { title: "RAG Engine", url: "/rag", icon: Brain, permissions: ["admin.config"] },
      { title: "Assistant", url: "/assistant", icon: MessageSquare, permissions: ["admin.config"] },
      { title: "Model Orchestration", url: "/models", icon: Cpu, permissions: ["mlops.view"] },
      { title: "Prompts", url: "/prompts", icon: FileText, permissions: ["admin.config"] },
    ],
  },
  {
    label: "Analytics & Security",
    items: [
      { title: "Analytics", url: "/analytics", icon: TrendingUp, permissions: ["audit.read"], roles: ["sys_admin","tenant_admin","finance_manager","ops_manager","auditor"] },
      { title: "Analytics Platform", url: "/analytics-platform", icon: Layers, permissions: ["analytics:view"], roles: ["sys_admin","tenant_admin"] },
      { title: "Custom Reports", url: "/custom-reports", icon: FileBarChart, permissions: ["audit.read"], roles: ["sys_admin","tenant_admin","ops_manager"] },
      { title: "Forecast Center", url: "/forecast", icon: Activity, permissions: ["audit.read"], roles: ["sys_admin","tenant_admin","finance_manager","ops_manager"] },
      { title: "Fraud Detection", url: "/fraud", icon: ShieldAlert, permissions: ["fraud.view"], roles: ["sys_admin","fraud_investigator","auditor"] },
      { title: "Forgery Detection", url: "/forgery-detection", icon: Shield, permissions: ["fraud.view"], roles: ["sys_admin","fraud_investigator","auditor"] },
      { title: "Anomaly Detection", url: "/anomaly", icon: Activity, permissions: ["fraud.view"], roles: ["sys_admin","fraud_investigator","auditor"] },
      { title: "Compliance Dashboard", url: "/compliance-dashboard", icon: Shield, permissions: ["audit.read"], roles: ["sys_admin","tenant_admin","auditor"] },
      { title: "Observability", url: "/observability", icon: Eye, permissions: ["audit.read"], roles: ["sys_admin","tenant_admin","ops_manager"] },
      { title: "AB Test Manager", url: "/ab-tests", icon: FlaskConical, permissions: ["mlops.view"], roles: ["sys_admin","tenant_admin"] },
    ],
  },
  {
    label: "Portals",
    items: [
      { title: "Customer Portal", url: "/customer-portal", icon: Globe, permissions: ["portal.access"], roles: ["sys_admin","tenant_admin","customer"] },
      { title: "Partner Portal", url: "/partner-portal", icon: Handshake, permissions: ["partners.view"], roles: ["sys_admin","tenant_admin","partner_admin"] },
      { title: "Training Platform", url: "/training", icon: GraduationCap },
    ],
  },
  {
    label: "Developer",
    items: [
      { title: "Developer Console", url: "/developer-console", icon: Code2, permissions: ["admin.config"] },
      { title: "Developer Portal", url: "/developer-portal", icon: Code2, roles: ["sys_admin", "tenant_admin", "partner_admin"] },
      { title: "Industry Workflows", url: "/industry-workflows", icon: Workflow, roles: ["sys_admin", "tenant_admin", "ops_manager"] },
      { title: "Webhooks", url: "/webhooks", icon: Webhook, permissions: ["admin.config"] },
      { title: "Marketplace", url: "/marketplace", icon: Store, permissions: ["admin.config"] },
      { title: "Marketplace Management", url: "/marketplace-management", icon: Package, roles: ["sys_admin"] },
      { title: "Platform Metrics", url: "/platform-metrics", icon: BarChart3, roles: ["sys_admin"] },
      { title: "Analytics Integrations", url: "/analytics-integrations", icon: BarChart3, permissions: ["admin.config"] },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Documents", url: "/documents", icon: FileText, permissions: ["documents.view"] },
      { title: "Templates", url: "/templates", icon: ClipboardList, permissions: ["admin.config"] },
      { title: "Admin Console", url: "/admin", icon: Shield, roles: ["sys_admin", "tenant_admin"] },
      { title: "Compliance Center", url: "/compliance", icon: Shield, permissions: ["admin.config"] },
      { title: "System Health", url: "/system-health", icon: Heart, permissions: ["admin.config"] },
      { title: "Help & Training", url: "/help", icon: GraduationCap },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

// Map URLs to modules for filtering
const URL_TO_MODULE: Record<string, AuthModule> = {
  '/equipment': 'asset',
  '/equipment/': 'asset',
  '/work-orders': 'fsm',
  '/work-orders/': 'fsm',
  '/dispatch': 'fsm',
  '/scheduler': 'fsm',
  '/pending-validation': 'fsm',
  '/forecast': 'forecasting',
  '/forecast/': 'forecasting',
  '/fraud': 'fraud',
  '/forgery-detection': 'fraud',
  '/anomaly': 'fraud',
  '/marketplace': 'marketplace',
  '/marketplace-management': 'marketplace',
  '/analytics': 'analytics',
  '/analytics-platform': 'analytics',
  '/customer-portal': 'customer',
  '/customers': 'customer',
  '/knowledge-base': 'training',
  '/training-platform': 'training',
};

export function AppSidebar() {
  const { hasAnyPermission, hasAnyRole, hasRole, isAdmin, loading, roles } = useRBAC();
  const { user } = useAuth();
  const location = useLocation();
  const [currentModule, setCurrentModule] = useState<AuthModule | null>(null);

  // Get current module from URL or user profile
  useEffect(() => {
    const path = location.pathname;
    const moduleFromUrl = URL_TO_MODULE[path] || URL_TO_MODULE[path + '/'];
    
    if (moduleFromUrl) {
      setCurrentModule(moduleFromUrl);
    } else if (user) {
      // Try to get from profile
      apiClient.from('profiles')
        .select('current_module_context')
        .eq('id', user.id)
        .single()
        .then((result) => {
          if (result.data?.current_module_context) {
            setCurrentModule(result.data.current_module_context as AuthModule);
          } else {
            setCurrentModule('platform');
          }
        })
        .catch(() => {
          // Default to platform if no module context
          setCurrentModule('platform');
        });
    } else {
      setCurrentModule('platform');
    }
  }, [user, location.pathname]);

  const canAccessItem = (item: MenuItem): boolean => {
    // Dashboard, Settings, and Help & Training are accessible to all authenticated users
    if (item.url === "/dashboard" || item.url === "/settings" || item.url === "/help") {
      return true;
    }

    // sys_admin can see everything
    if (hasRole('sys_admin')) {
      return true;
    }

    // If we have a module context (not platform), filter by module-relevant roles
    // Only show items that belong to the current module OR items user has access to in other modules
    if (currentModule && currentModule !== 'platform') {
      const itemModule = URL_TO_MODULE[item.url] || URL_TO_MODULE[item.url + '/'];
      
      // If item belongs to a different module, check if user has access to that module
      if (itemModule && itemModule !== currentModule) {
        const itemModuleRoles = MODULE_RELEVANT_ROLES[itemModule] || [];
        const hasAccessToItemModule = itemModuleRoles.some(role => hasRole(role as AppRole));
        // Only show if user has explicit access to that module
        if (!hasAccessToItemModule) {
          return false;
        }
      }
      
      // For items in the current module, check if user has relevant role
      if (itemModule === currentModule) {
        const moduleRoles = MODULE_RELEVANT_ROLES[currentModule] || [];
        const hasModuleRole = moduleRoles.some(role => hasRole(role as AppRole));
        if (!hasModuleRole) {
          return false;
        }
      }
    }

    // Check role-based access first (more specific)
    if (item.roles && item.roles.length > 0) {
      return hasAnyRole(item.roles as AppRole[]);
    }

    // Check permission-based access
    if (item.permissions && item.permissions.length > 0) {
      return hasAnyPermission(item.permissions);
    }

    // If no permissions or roles specified, deny access by default for security
    return false;
  };

  const getVisibleGroups = (): MenuGroup[] => {
    return menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(canAccessItem),
      }))
      .filter((group) => group.items.length > 0);
  };

  if (loading) {
    return (
      <Sidebar collapsible="icon">
        <SidebarContent>
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#2563EB] flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-bold bg-gradient-to-r from-[#7C3AED] to-[#2563EB] bg-clip-text text-transparent">Guardian Flow</span>
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  const visibleGroups = getVisibleGroups();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#2563EB] flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold bg-gradient-to-r from-[#7C3AED] to-[#2563EB] bg-clip-text text-transparent">Guardian Flow</span>
            <span className="text-xs text-muted-foreground">Enterprise AI Platform</span>
          </div>
        </div>

        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={({ isActive }) =>
                          isActive
                            ? "bg-[#2563EB]/10 text-[#2563EB] border-l-2 border-[#2563EB] font-medium"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
