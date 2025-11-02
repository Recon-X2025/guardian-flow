import { NavLink } from "react-router-dom";
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
import { useRBAC } from "@/contexts/RBACContext";
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
      { title: "Photo Capture", url: "/photo-capture", icon: Camera, permissions: ["attachment.upload"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher","technician"] },
      { title: "Service Orders", url: "/service-orders", icon: FileCheck, permissions: ["so.view"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher","technician"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Pending Validation", url: "/pending-validation", icon: AlertTriangle, permissions: ["wo.read"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher"] },
      { title: "Scheduler", url: "/scheduler", icon: Calendar, permissions: ["wo.assign"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher"] },
      { title: "Dispatch", url: "/dispatch", icon: MapPin, permissions: ["wo.assign"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher"] },
      { title: "Route Optimization", url: "/route-optimization", icon: Route, permissions: ["wo.assign"], roles: ["sys_admin","tenant_admin","ops_manager","dispatcher"] },
      { title: "Inventory", url: "/inventory", icon: Package, permissions: ["inventory.view"], roles: ["sys_admin","tenant_admin","ops_manager","partner_admin"] },
      { title: "Procurement", url: "/procurement", icon: ShoppingCart, permissions: ["inventory.procure"], roles: ["sys_admin","tenant_admin","ops_manager"] },
      { title: "Warranty & RMA", url: "/warranty", icon: Shield, permissions: ["warranty.view"], roles: ["sys_admin","tenant_admin","ops_manager","support_agent"] },
    ],
  },
  {
    label: "Financial",
    items: [
      { title: "Quotes", url: "/quotes", icon: FileText, permissions: ["quote.view"], roles: ["sys_admin","tenant_admin","finance_manager"] },
      { title: "Invoicing", url: "/invoicing", icon: Receipt, permissions: ["invoice.view"], roles: ["sys_admin","tenant_admin","finance_manager"] },
      { title: "Payments", url: "/payments", icon: CreditCard, permissions: ["invoice.pay"], roles: ["sys_admin","tenant_admin","finance_manager"] },
      { title: "Finance", url: "/finance", icon: DollarSign, permissions: ["finance.view"], roles: ["sys_admin","tenant_admin","finance_manager"] },
      { title: "Penalties", url: "/penalties", icon: AlertTriangle, permissions: ["penalty.calculate"], roles: ["sys_admin","tenant_admin","finance_manager"] },
    ],
  },
  {
    label: "AI & Automation",
    items: [
      { title: "Offer AI", url: "/sapos", icon: Sparkles, permissions: ["sapos.view"] },
      { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen, permissions: ["admin.config"] },
      { title: "RAG Engine", url: "/rag", icon: Brain, permissions: ["admin.config"] },
      { title: "Assistant", url: "/assistant", icon: MessageSquare, permissions: ["admin.config"] },
      { title: "Model Orchestration", url: "/models", icon: Bot, permissions: ["mlops.view"] },
      { title: "Prompts", url: "/prompts", icon: FileText, permissions: ["admin.config"] },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Analytics", url: "/analytics", icon: TrendingUp, permissions: ["audit.read"], roles: ["sys_admin","tenant_admin","finance_manager","ops_manager","auditor"] },
      { title: "Forecast Center", url: "/forecast", icon: Activity, permissions: ["audit.read"], roles: ["sys_admin","tenant_admin","finance_manager","ops_manager"] },
      { title: "Fraud Detection", url: "/fraud", icon: ShieldAlert, permissions: ["fraud.view"], roles: ["sys_admin","fraud_investigator","auditor"] },
      { title: "Forgery Detection", url: "/forgery-detection", icon: Shield, permissions: ["fraud.view"], roles: ["sys_admin","fraud_investigator","auditor"] },
      { title: "Anomaly Detection", url: "/anomaly", icon: Activity, permissions: ["fraud.view"], roles: ["sys_admin","fraud_investigator","auditor"] },
      { title: "Observability", url: "/observability", icon: Eye, permissions: ["audit.read"], roles: ["sys_admin","tenant_admin","ops_manager"] },
    ],
  },
  {
    label: "Developer",
    items: [
      { title: "Developer Console", url: "/developer-console", icon: Brain, permissions: ["admin.config"] },
      { title: "Developer Portal", url: "/developer-portal", icon: Code2, roles: ["sys_admin", "tenant_admin", "partner_admin"] },
      { title: "Industry Workflows", url: "/industry-workflows", icon: Workflow, roles: ["sys_admin", "tenant_admin", "ops_manager"] },
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
      { title: "Templates", url: "/templates", icon: FileText, permissions: ["admin.config"] },
      { title: "Admin Console", url: "/admin", icon: Shield, roles: ["sys_admin", "tenant_admin"] },
      { title: "Compliance Center", url: "/compliance", icon: Shield, permissions: ["admin.config"] },
      { title: "System Health", url: "/system-health", icon: Heart, permissions: ["admin.config"] },
      { title: "Help & Training", url: "/help", icon: GraduationCap },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { hasAnyPermission, hasAnyRole, hasRole, isAdmin, loading } = useRBAC();

  const canAccessItem = (item: MenuItem): boolean => {
    // Dashboard, Settings, and Help & Training are accessible to all authenticated users
    if (item.url === "/dashboard" || item.url === "/settings" || item.url === "/help") {
      return true;
    }

    // sys_admin can see everything
    if (hasRole('sys_admin')) {
      return true;
    }

    // Check role-based access first (more specific)
    if (item.roles && item.roles.length > 0) {
      return hasAnyRole(item.roles as any);
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
          <div className="flex items-center gap-2 px-4 py-4">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-bold text-sidebar-foreground">Guardian Flow</span>
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
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold text-sidebar-foreground">Guardian Flow</span>
            <span className="text-xs text-muted-foreground">Field Service Platform</span>
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
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/50"
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
