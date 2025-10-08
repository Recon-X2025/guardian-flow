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
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Analytics", url: "/analytics", icon: Activity, permissions: ["audit.read"] },
      { title: "Tickets", url: "/tickets", icon: Clipboard, permissions: ["ticket.read"] },
      { title: "Work Orders", url: "/work-orders", icon: Wrench, permissions: ["wo.read"] },
      { title: "Photo Capture", url: "/photo-capture", icon: Camera, permissions: ["attachment.upload"] },
      { title: "Service Orders", url: "/service-orders", icon: FileCheck, permissions: ["so.view"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Pending Validation", url: "/pending-validation", icon: AlertTriangle, permissions: ["wo.read"] },
      { title: "Scheduler", url: "/scheduler", icon: Calendar, permissions: ["wo.assign"] },
      { title: "Dispatch", url: "/dispatch", icon: MapPin, permissions: ["wo.assign"] },
      { title: "Inventory", url: "/inventory", icon: Package, permissions: ["inventory.view"] },
      { title: "Procurement", url: "/procurement", icon: ShoppingCart, permissions: ["inventory.procure"] },
      { title: "Warranty & RMA", url: "/warranty", icon: Shield, permissions: ["warranty.view"] },
    ],
  },
  {
    label: "Financial",
    items: [
      { title: "Quotes", url: "/quotes", icon: FileText, permissions: ["quote.view"] },
      { title: "Invoicing", url: "/invoicing", icon: Receipt, permissions: ["invoice.view"] },
      { title: "Payments", url: "/payments", icon: CreditCard, permissions: ["invoice.pay"] },
      { title: "Finance", url: "/finance", icon: DollarSign, permissions: ["finance.view"] },
      { title: "Penalties", url: "/penalties", icon: AlertTriangle, permissions: ["penalty.calculate"] },
    ],
  },
  {
    label: "AI & Automation",
    items: [
      { title: "SaPOS AI", url: "/sapos", icon: Sparkles, permissions: ["sapos.view"] },
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
      { title: "Analytics", url: "/analytics", icon: TrendingUp, permissions: ["audit.read"] },
      { title: "Forecast Center", url: "/forecast", icon: Activity, permissions: ["audit.read"] },
      { title: "Fraud Detection", url: "/fraud", icon: ShieldAlert, permissions: ["fraud.view"] },
      { title: "Anomaly Detection", url: "/anomaly", icon: Activity, permissions: ["fraud.view"] },
      { title: "Observability", url: "/observability", icon: Eye, permissions: ["audit.read"] },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Product Specs", url: "/product-specs", icon: FileText },
      { title: "Help & Training", url: "/help", icon: GraduationCap },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { hasAnyPermission, isAdmin, loading } = useRBAC();

  const canAccessItem = (item: MenuItem): boolean => {
    // Dashboard, Settings, Help & Training, and Product Specs are accessible to all authenticated users
    if (item.url === "/" || item.url === "/settings" || item.url === "/help" || item.url === "/product-specs") {
      return true;
    }

    // Admins can see everything
    if (isAdmin) {
      return true;
    }

    // Check permissions
    if (item.permissions && item.permissions.length > 0) {
      return hasAnyPermission(item.permissions);
    }

    // If no permissions specified, default to accessible
    return true;
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
              <span className="text-sm font-bold text-sidebar-foreground">ReconX AI</span>
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
            <span className="text-sm font-bold text-sidebar-foreground">ReconX AI</span>
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
