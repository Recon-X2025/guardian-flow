import { 
  Wrench, Clock, Package, TrendingUp, DollarSign, 
  Shield, AlertTriangle, CheckCircle2, Users, 
  FileText, Activity, BarChart3, Briefcase,
  ClipboardCheck, Eye, Search, Target
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface DashboardCard {
  title: string;
  dataKey: keyof DashboardStats;
  icon: LucideIcon;
  color: string;
  subtitle?: string;
  formatter?: (value: any) => string;
}

export interface DashboardStats {
  // Work Order metrics
  totalWOs: number;
  activeWorkOrders: number;
  completedWOs: number;
  pendingValidation: number;
  myAssignedWOs: number;
  myCompletedToday: number;
  
  // Ticket metrics
  pendingTickets: number;
  openTickets: number;
  
  // Inventory metrics
  partsInStock: number;
  lowStockItems: number;
  
  // Financial metrics
  saposRevenue: number;
  totalPayables: number;
  monthlyRevenue: number;
  overdueInvoices: number;
  
  // Fraud & Compliance
  activeFraudCases: number;
  anomaliesDetected: number;
  forgeriesDetected: number;
  complianceScore: number;
  policyViolations: number;
  auditsPending: number;
  
  // Team metrics
  activeTechnicians: number;
  totalCustomers: number;
  partnerPerformance: number;
}

export type DashboardRoleConfig = {
  [key: string]: {
    cards: DashboardCard[];
    showOperationalView?: boolean;
    showCharts?: boolean;
  };
};

export const dashboardRoleConfig: DashboardRoleConfig = {
  sys_admin: {
    cards: [
      { title: "Total Work Orders", dataKey: "totalWOs", icon: Wrench, color: "text-primary", subtitle: "Platform-wide" },
      { title: "Active WOs", dataKey: "activeWorkOrders", icon: Activity, color: "text-blue-600" },
      { title: "Pending Tickets", dataKey: "pendingTickets", icon: Clock, color: "text-warning" },
      { title: "Parts in Stock", dataKey: "partsInStock", icon: Package, color: "text-success" },
      { title: "Revenue (Offers)", dataKey: "saposRevenue", icon: TrendingUp, color: "text-accent" },
    ],
    showOperationalView: true,
    showCharts: true,
  },
  
  tenant_admin: {
    cards: [
      { title: "Total Work Orders", dataKey: "totalWOs", icon: Wrench, color: "text-primary" },
      { title: "Active WOs", dataKey: "activeWorkOrders", icon: Activity, color: "text-blue-600" },
      { title: "Completed WOs", dataKey: "completedWOs", icon: CheckCircle2, color: "text-success" },
      { title: "Active Technicians", dataKey: "activeTechnicians", icon: Users, color: "text-purple-600" },
      { title: "Monthly Revenue", dataKey: "monthlyRevenue", icon: TrendingUp, color: "text-accent" },
    ],
    showOperationalView: true,
    showCharts: true,
  },
  
  partner_admin: {
    cards: [
      { title: "My Work Orders", dataKey: "totalWOs", icon: Wrench, color: "text-primary" },
      { title: "In Progress", dataKey: "activeWorkOrders", icon: Activity, color: "text-blue-600" },
      { title: "Completed", dataKey: "completedWOs", icon: CheckCircle2, color: "text-success" },
      { title: "My Technicians", dataKey: "activeTechnicians", icon: Users, color: "text-purple-600" },
      { title: "Parts Available", dataKey: "partsInStock", icon: Package, color: "text-orange-600" },
    ],
    showOperationalView: true,
    showCharts: true,
  },
  
  vendor_admin: {
    cards: [
      { title: "Total Payables", dataKey: "totalPayables", icon: DollarSign, color: "text-orange-500" },
      { title: "Active Contracts", dataKey: "totalWOs", icon: FileText, color: "text-primary" },
      { title: "Overdue Invoices", dataKey: "overdueInvoices", icon: AlertTriangle, color: "text-red-600" },
      { title: "Parts Supplied", dataKey: "partsInStock", icon: Package, color: "text-success" },
      { title: "Monthly Revenue", dataKey: "monthlyRevenue", icon: TrendingUp, color: "text-accent" },
    ],
    showCharts: true,
  },
  
  fraud_investigator: {
    cards: [
      { title: "Active Cases", dataKey: "activeFraudCases", icon: Shield, color: "text-red-600" },
      { title: "Anomalies Detected", dataKey: "anomaliesDetected", icon: AlertTriangle, color: "text-orange-600" },
      { title: "Forgeries Found", dataKey: "forgeriesDetected", icon: Eye, color: "text-purple-600" },
      { title: "Cases Resolved", dataKey: "completedWOs", icon: CheckCircle2, color: "text-success" },
      { title: "Investigation Queue", dataKey: "pendingValidation", icon: Search, color: "text-blue-600" },
    ],
    showCharts: false,
  },
  
  technician: {
    cards: [
      { title: "My Assigned WOs", dataKey: "myAssignedWOs", icon: Wrench, color: "text-primary" },
      { title: "Completed Today", dataKey: "myCompletedToday", icon: CheckCircle2, color: "text-success" },
      { title: "Pending Tasks", dataKey: "activeWorkOrders", icon: Clock, color: "text-warning" },
      { title: "Parts Needed", dataKey: "lowStockItems", icon: Package, color: "text-orange-600" },
      { title: "Open Tickets", dataKey: "openTickets", icon: FileText, color: "text-blue-600" },
    ],
    showCharts: false,
  },
  
  dispatcher: {
    cards: [
      { title: "Pending Assignment", dataKey: "pendingValidation", icon: Clock, color: "text-warning" },
      { title: "Active WOs", dataKey: "activeWorkOrders", icon: Activity, color: "text-blue-600" },
      { title: "Available Techs", dataKey: "activeTechnicians", icon: Users, color: "text-success" },
      { title: "Open Tickets", dataKey: "openTickets", icon: FileText, color: "text-purple-600" },
      { title: "Today's Schedule", dataKey: "totalWOs", icon: Target, color: "text-primary" },
    ],
    showOperationalView: true,
    showCharts: true,
  },
  
  finance_manager: {
    cards: [
      { title: "Monthly Revenue", dataKey: "monthlyRevenue", icon: TrendingUp, color: "text-success" },
      { title: "Total Payables", dataKey: "totalPayables", icon: DollarSign, color: "text-orange-500" },
      { title: "Offers Revenue", dataKey: "saposRevenue", icon: Briefcase, color: "text-accent" },
      { title: "Overdue Invoices", dataKey: "overdueInvoices", icon: AlertTriangle, color: "text-red-600" },
      { title: "Completed WOs", dataKey: "completedWOs", icon: CheckCircle2, color: "text-blue-600" },
    ],
    showCharts: true,
  },
  
  compliance_officer: {
    cards: [
      { title: "Compliance Score", dataKey: "complianceScore", icon: Shield, color: "text-success", subtitle: "Out of 100" },
      { title: "Policy Violations", dataKey: "policyViolations", icon: AlertTriangle, color: "text-red-600" },
      { title: "Audits Pending", dataKey: "auditsPending", icon: ClipboardCheck, color: "text-warning" },
      { title: "Active Cases", dataKey: "activeFraudCases", icon: Eye, color: "text-purple-600" },
      { title: "Documents Reviewed", dataKey: "completedWOs", icon: FileText, color: "text-blue-600" },
    ],
    showCharts: false,
  },
  
  customer: {
    cards: [
      { title: "My Tickets", dataKey: "openTickets", icon: FileText, color: "text-primary" },
      { title: "In Progress", dataKey: "activeWorkOrders", icon: Activity, color: "text-blue-600" },
      { title: "Completed", dataKey: "completedWOs", icon: CheckCircle2, color: "text-success" },
      { title: "Pending Response", dataKey: "pendingValidation", icon: Clock, color: "text-warning" },
    ],
    showCharts: false,
  },
};

// Default config for roles not explicitly defined
export const defaultDashboardConfig = {
  cards: [
    { title: "Total Work Orders", dataKey: "totalWOs" as keyof DashboardStats, icon: Wrench, color: "text-primary" },
    { title: "Active WOs", dataKey: "activeWorkOrders" as keyof DashboardStats, icon: Activity, color: "text-blue-600" },
    { title: "Pending Tickets", dataKey: "pendingTickets" as keyof DashboardStats, icon: Clock, color: "text-warning" },
  ],
  showCharts: true,
  showOperationalView: false,
};

export function getRoleConfig(roles: string[]): typeof defaultDashboardConfig {
  // Priority order for role configs
  const rolePriority = [
    'sys_admin',
    'fraud_investigator',
    'compliance_officer',
    'finance_manager',
    'tenant_admin',
    'partner_admin',
    'vendor_admin',
    'dispatcher',
    'technician',
    'customer',
  ];
  
  for (const role of rolePriority) {
    if (roles.includes(role) && dashboardRoleConfig[role]) {
      const config = dashboardRoleConfig[role];
      return {
        ...config,
        showCharts: config.showCharts ?? false,
        showOperationalView: config.showOperationalView ?? false,
      };
    }
  }
  
  return defaultDashboardConfig;
}
