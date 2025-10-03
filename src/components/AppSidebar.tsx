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

const coreModules = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Tickets", url: "/tickets", icon: Clipboard },
  { title: "Work Orders", url: "/work-orders", icon: Wrench },
  { title: "Photo Capture", url: "/photo-capture", icon: Camera },
  { title: "Service Orders", url: "/service-orders", icon: FileCheck },
];

const operationsModules = [
  { title: "Scheduler", url: "/scheduler", icon: Calendar },
  { title: "Dispatch", url: "/dispatch", icon: MapPin },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Procurement", url: "/procurement", icon: ShoppingCart },
  { title: "Warranty & RMA", url: "/warranty", icon: Shield },
];

const financialModules = [
  { title: "Quotes", url: "/quotes", icon: FileText },
  { title: "Invoicing", url: "/invoicing", icon: Receipt },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Finance & Settlements", url: "/settlements", icon: DollarSign },
  { title: "Penalties", url: "/penalties", icon: AlertTriangle },
];

const aiModules = [
  { title: "SaPOS AI", url: "/sapos", icon: Sparkles },
  { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen },
  { title: "RAG Engine", url: "/rag", icon: Brain },
  { title: "Assistant", url: "/assistant", icon: MessageSquare },
  { title: "Model Orchestration", url: "/models", icon: Bot },
  { title: "Prompts", url: "/prompts", icon: FileText },
];

const analyticsModules = [
  { title: "Analytics", url: "/analytics", icon: TrendingUp },
  { title: "Fraud Detection", url: "/fraud", icon: ShieldAlert },
  { title: "Anomaly Detection", url: "/anomaly", icon: Activity },
  { title: "Observability", url: "/observability", icon: Eye },
];

const settingsModules = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
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

        <SidebarGroup>
          <SidebarGroupLabel>Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreModules.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
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

        <SidebarGroup>
          <SidebarGroupLabel>Financial</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financialModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
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

        <SidebarGroup>
          <SidebarGroupLabel>AI & Automation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
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

        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
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

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
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
      </SidebarContent>
    </Sidebar>
  );
}
