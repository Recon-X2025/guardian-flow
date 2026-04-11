import { lazy, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/domains/auth/contexts/AuthContext";
import { RBACProvider } from "@/domains/auth/contexts/RBACContext";
import { ProtectedRoute } from "@/domains/auth/components/ProtectedRoute";
import { RoleGuard } from "@/domains/auth/components/RoleGuard";
import { ErrorBoundary } from "@/domains/shared/components/ErrorBoundary";
import { AccessDenied } from "@/domains/auth/components/AccessDenied";
import { AppLayout } from "@/domains/shared/components/AppLayout";
import { Toaster } from '@/components/ui/sonner';

// Lazy-loaded page components
const Auth = lazy(() => import("@/domains/auth/pages/Auth"));
const Dashboard = lazy(() => import("@/domains/shared/pages/Dashboard"));
const Tickets = lazy(() => import("@/domains/tickets/pages/Tickets"));
const WorkOrders = lazy(() => import("@/domains/workOrders/pages/WorkOrders"));
const PendingValidation = lazy(() => import("@/domains/shared/pages/PendingValidation"));
const Inventory = lazy(() => import("@/domains/inventory/pages/Inventory"));
const Warranty = lazy(() => import("@/domains/financial/pages/Warranty"));
const Penalties = lazy(() => import("@/domains/financial/pages/Penalties"));
const OfferAI = lazy(() => import("@/domains/shared/pages/OfferAI"));
const ServiceOrders = lazy(() => import("@/domains/workOrders/pages/ServiceOrders"));
const FraudInvestigation = lazy(() => import("@/domains/fraud/pages/FraudInvestigation"));
const ForgeryDetection = lazy(() => import("@/domains/fraud/pages/ForgeryDetection"));
const Finance = lazy(() => import("@/domains/financial/pages/Finance"));
const PhotoCapturePage = lazy(() => import("@/domains/shared/pages/PhotoCapturePage"));
const Quotes = lazy(() => import("@/domains/financial/pages/Quotes"));
const Scheduler = lazy(() => import("@/domains/workOrders/pages/Scheduler"));
const Dispatch = lazy(() => import("@/domains/workOrders/pages/Dispatch"));
const Procurement = lazy(() => import("@/domains/inventory/pages/Procurement"));
const Settings = lazy(() => import("@/domains/shared/pages/Settings"));
const AdminConsole = lazy(() => import("@/domains/shared/pages/AdminConsole"));
const NotFound = lazy(() => import("@/domains/shared/pages/NotFound"));
const Invoicing = lazy(() => import("@/domains/financial/pages/Invoicing"));
const Payments = lazy(() => import("@/domains/financial/pages/Payments"));
const Analytics = lazy(() => import("@/domains/analytics/pages/Analytics"));
const DeveloperConsole = lazy(() => import("@/domains/shared/pages/DeveloperConsole"));
const DeveloperLanding = lazy(() => import("@/domains/shared/pages/DeveloperLanding"));
const PlatformMetrics = lazy(() => import("@/domains/analytics/pages/PlatformMetrics"));
const AnalyticsIntegrations = lazy(() => import("@/domains/analytics/pages/AnalyticsIntegrations"));
const Observability = lazy(() => import("@/domains/shared/pages/Observability"));
const KnowledgeBase = lazy(() => import("@/domains/knowledge/pages/KnowledgeBase"));
const FAQPage = lazy(() => import("@/domains/knowledge/pages/FAQPage"));
const Assistant = lazy(() => import("@/domains/shared/pages/Assistant"));
const ModelOrchestration = lazy(() => import("@/domains/shared/pages/ModelOrchestration"));
const HelpTraining = lazy(() => import("@/domains/training/pages/HelpTraining"));
const AnomalyDetection = lazy(() => import("@/domains/analytics/pages/AnomalyDetection"));
const AgentDashboard = lazy(() => import("@/domains/shared/pages/AgentDashboard"));
const RAGEngine = lazy(() => import("@/domains/knowledge/pages/RAGEngine"));
const Prompts = lazy(() => import("@/domains/shared/pages/Prompts"));
const ForecastCenter = lazy(() => import("@/domains/analytics/pages/ForecastCenter"));
const RouteOptimization = lazy(() => import("@/domains/workOrders/pages/RouteOptimization"));
const Customers = lazy(() => import("@/domains/customers/pages/Customers"));
const Technicians = lazy(() => import("@/domains/shared/pages/Technicians"));
const Equipment = lazy(() => import("@/domains/inventory/pages/Equipment"));
const Contracts = lazy(() => import("@/domains/shared/pages/Contracts"));
const CustomerPortal = lazy(() => import("@/domains/customers/pages/CustomerPortal"));
const PredictiveMaintenance = lazy(() => import("@/domains/workOrders/pages/PredictiveMaintenance"));
const PartnerPortal = lazy(() => import("@/domains/customers/pages/PartnerPortal"));
const Documents = lazy(() => import("@/domains/shared/pages/Documents"));
const Webhooks = lazy(() => import("@/domains/shared/pages/Webhooks"));
const Marketplace = lazy(() => import("@/domains/marketplace/pages/Marketplace"));
const DisputeManagement = lazy(() => import("@/domains/financial/pages/DisputeManagement"));
const GeneralLedger = lazy(() => import("@/domains/financial/pages/GeneralLedger"));
const AccountsPayable = lazy(() => import("@/domains/financial/pages/AccountsPayable"));
const ABTestManager = lazy(() => import("@/domains/shared/pages/ABTestManager"));
const SystemHealth = lazy(() => import("@/domains/shared/pages/SystemHealth"));
const ComplianceDashboard = lazy(() => import("@/domains/fraud/pages/ComplianceDashboard"));
const ComplianceCenter = lazy(() => import("@/domains/fraud/pages/ComplianceCenter"));
const MarketplaceManagement = lazy(() => import("@/domains/marketplace/pages/MarketplaceManagement"));
const DeveloperPortal = lazy(() => import("@/domains/shared/pages/DeveloperPortal"));
const IndustryWorkflows = lazy(() => import("@/domains/shared/pages/IndustryWorkflows"));
const Templates = lazy(() => import("@/domains/shared/pages/Templates"));
const Landing = lazy(() => import("@/domains/shared/pages/Landing"));
const PricingCalculator = lazy(() => import("@/domains/financial/pages/PricingCalculator"));
const FieldServiceModule = lazy(() => import("./pages/modules/FieldServiceModule"));
const AssetLifecycleModule = lazy(() => import("./pages/modules/AssetLifecycleModule"));
const AIForecastingModule = lazy(() => import("./pages/modules/AIForecastingModule"));
const FraudComplianceModule = lazy(() => import("./pages/modules/FraudComplianceModule"));
const MarketplaceModule = lazy(() => import("./pages/modules/MarketplaceModule"));
const AnalyticsBIModule = lazy(() => import("./pages/modules/AnalyticsBIModule"));
const CustomerPortalModule = lazy(() => import("./pages/modules/CustomerPortalModule"));
const VideoTrainingModule = lazy(() => import("./pages/modules/VideoTrainingModule"));
const AnalyticsPlatformModule = lazy(() => import("./pages/modules/AnalyticsPlatformModule"));
const Contact = lazy(() => import("@/domains/shared/pages/Contact"));
const Privacy = lazy(() => import("@/domains/shared/pages/Privacy"));
const Terms = lazy(() => import("@/domains/shared/pages/Terms"));
const AnalyticsPlatform = lazy(() => import("@/domains/analytics/pages/AnalyticsPlatform"));
const AnalyticsPlatformAuth = lazy(() => import("@/domains/analytics/pages/AnalyticsPlatformAuth"));
const IndustryOnboarding = lazy(() => import("@/domains/shared/pages/IndustryOnboarding"));
const ImageForensicsModule = lazy(() => import("./pages/modules/ImageForensicsModule"));
const EnhancedSchedulerModule = lazy(() => import("./pages/modules/EnhancedSchedulerModule"));
const AdvancedComplianceModule = lazy(() => import("./pages/modules/AdvancedComplianceModule"));
const UnifiedPlatformAuth = lazy(() => import("@/domains/auth/pages/auth/UnifiedPlatformAuth"));
const FSMAuth = lazy(() => import("@/domains/auth/pages/auth/FSMAuth"));
const AssetAuth = lazy(() => import("@/domains/auth/pages/auth/AssetAuth"));
const ForecastingAuth = lazy(() => import("@/domains/auth/pages/auth/ForecastingAuth"));
const FraudAuth = lazy(() => import("@/domains/auth/pages/auth/FraudAuth"));
const MarketplaceAuth = lazy(() => import("@/domains/auth/pages/auth/MarketplaceAuth"));
const AnalyticsAuth = lazy(() => import("@/domains/auth/pages/auth/AnalyticsAuth"));
const CustomerAuth = lazy(() => import("@/domains/auth/pages/auth/CustomerAuth"));
const TrainingAuth = lazy(() => import("@/domains/auth/pages/auth/TrainingAuth"));
const TrainingPlatform = lazy(() => import("@/domains/training/pages/TrainingPlatform"));
const OrgManagementConsole = lazy(() => import("@/domains/org/pages/OrgManagementConsole"));
const AssetRegister = lazy(() => import("@/domains/workOrders/pages/AssetRegister"));
const ConnectorManagement = lazy(() => import("@/domains/org/pages/ConnectorManagement"));
const CRMAccounts = lazy(() => import("@/domains/crm/pages/Accounts"));
const CRMContacts = lazy(() => import("@/domains/crm/pages/Contacts"));
const CRMPipeline = lazy(() => import("@/domains/crm/pages/Pipeline"));
const CRMPipelineSettings = lazy(() => import("@/domains/crm/pages/PipelineSettings"));
const CRMLeads = lazy(() => import("@/domains/crm/pages/Leads"));
const ScheduleOptimizer = lazy(() => import("@/domains/workOrders/pages/ScheduleOptimizer"));
const NLPQueryInterface = lazy(() => import("@/domains/shared/pages/NLPQueryInterface"));
const CustomReportBuilder = lazy(() => import("@/domains/analytics/pages/CustomReportBuilder"));
const MaintenanceCalendar = lazy(() => import("@/domains/workOrders/pages/MaintenanceCalendar"));
const DecisionLedger = lazy(() => import("@/domains/flowspace/pages/DecisionLedger"));
const ExecutionConsole = lazy(() => import("@/domains/dex/pages/ExecutionConsole"));
const SsoCallback = lazy(() => import("@/domains/auth/pages/SsoCallback"));
const TechnicianProfile = lazy(() => import("@/domains/workOrders/pages/TechnicianProfile"));
const SkillsAdmin = lazy(() => import("@/domains/org/pages/SkillsAdmin"));
const ScheduleOptimiser = lazy(() => import("@/domains/workOrders/pages/ScheduleOptimiser"));
const CustomerBooking = lazy(() => import("@/domains/customers/pages/CustomerBooking"));
const Customer360 = lazy(() => import("@/domains/customers/pages/Customer360"));
const CommsHub = lazy(() => import("@/domains/shared/pages/CommsHub"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function SuspenseWrap({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <RBACProvider>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<SuspenseWrap><Landing /></SuspenseWrap>} />
                  <Route path="/pricing-calculator" element={<SuspenseWrap><PricingCalculator /></SuspenseWrap>} />
                  <Route path="/modules/field-service" element={<SuspenseWrap><FieldServiceModule /></SuspenseWrap>} />
                  <Route path="/modules/asset-lifecycle" element={<SuspenseWrap><AssetLifecycleModule /></SuspenseWrap>} />
                  <Route path="/modules/ai-forecasting" element={<SuspenseWrap><AIForecastingModule /></SuspenseWrap>} />
                  <Route path="/modules/fraud-compliance" element={<SuspenseWrap><FraudComplianceModule /></SuspenseWrap>} />
                  <Route path="/modules/marketplace" element={<SuspenseWrap><MarketplaceModule /></SuspenseWrap>} />
                  <Route path="/modules/analytics-bi" element={<SuspenseWrap><AnalyticsBIModule /></SuspenseWrap>} />
                  <Route path="/modules/customer-portal" element={<SuspenseWrap><CustomerPortalModule /></SuspenseWrap>} />
                  <Route path="/modules/video-training" element={<SuspenseWrap><VideoTrainingModule /></SuspenseWrap>} />
                  <Route path="/modules/analytics-platform" element={<SuspenseWrap><AnalyticsPlatformModule /></SuspenseWrap>} />
                  <Route path="/modules/image-forensics" element={<SuspenseWrap><ImageForensicsModule /></SuspenseWrap>} />
                  <Route path="/modules/enhanced-scheduler" element={<SuspenseWrap><EnhancedSchedulerModule /></SuspenseWrap>} />
                  <Route path="/modules/advanced-compliance" element={<SuspenseWrap><AdvancedComplianceModule /></SuspenseWrap>} />
                  <Route path="/industry-onboarding" element={<SuspenseWrap><IndustryOnboarding /></SuspenseWrap>} />
                  <Route path="/contact" element={<SuspenseWrap><Contact /></SuspenseWrap>} />
                  <Route path="/privacy" element={<SuspenseWrap><Privacy /></SuspenseWrap>} />
                  <Route path="/terms" element={<SuspenseWrap><Terms /></SuspenseWrap>} />

                  {/* Authentication Routes - Module-Specific FIRST (more specific routes before generic) */}
                  <Route path="/auth/fsm" element={<SuspenseWrap><FSMAuth /></SuspenseWrap>} />
                  <Route path="/auth/asset" element={<SuspenseWrap><AssetAuth /></SuspenseWrap>} />
                  <Route path="/auth/forecasting" element={<SuspenseWrap><ForecastingAuth /></SuspenseWrap>} />
                  <Route path="/auth/fraud" element={<SuspenseWrap><FraudAuth /></SuspenseWrap>} />
                  <Route path="/auth/marketplace" element={<SuspenseWrap><MarketplaceAuth /></SuspenseWrap>} />
                  <Route path="/auth/analytics" element={<SuspenseWrap><AnalyticsAuth /></SuspenseWrap>} />
                  <Route path="/auth/customer" element={<SuspenseWrap><CustomerAuth /></SuspenseWrap>} />
                  <Route path="/auth/training" element={<SuspenseWrap><TrainingAuth /></SuspenseWrap>} />
                  <Route path="/auth/platform" element={<SuspenseWrap><UnifiedPlatformAuth /></SuspenseWrap>} />
                  {/* SSO callback — must precede generic /auth */}
                  <Route path="/auth/sso-callback" element={<SuspenseWrap><SsoCallback /></SuspenseWrap>} />
                  {/* Generic /auth route must come LAST */}
                  <Route path="/auth" element={<SuspenseWrap><UnifiedPlatformAuth /></SuspenseWrap>} />
                  <Route path="/developer" element={<SuspenseWrap><DeveloperLanding /></SuspenseWrap>} />

                  {/* Protected Routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <AppLayout><SuspenseWrap><Dashboard /></SuspenseWrap></AppLayout>
                    </ProtectedRoute>
                  } />

                  <Route path="/tickets" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher','technician','support_agent']} permissions={["ticket.read"]} showError={true}>
                        <AppLayout><SuspenseWrap><Tickets /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/work-orders" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher','technician','partner_admin']} permissions={["wo.read"]} showError={true}>
                        <AppLayout><SuspenseWrap><WorkOrders /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/pending-validation" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher']} permissions={["wo.read"]} showError={true}>
                        <AppLayout><SuspenseWrap><PendingValidation /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/inventory" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','partner_admin']} permissions={["inventory.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><Inventory /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/photo-capture" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher','technician']} permissions={["attachment.upload"]} showError={true}>
                        <AppLayout><SuspenseWrap><PhotoCapturePage /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/scheduler" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher']} permissions={["wo.assign"]} showError={true}>
                        <AppLayout><SuspenseWrap><Scheduler /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/dispatch" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher']} permissions={["wo.assign"]} showError={true}>
                        <AppLayout><SuspenseWrap><Dispatch /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/route-optimization" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher']} permissions={["wo.assign"]} showError={true}>
                        <AppLayout><SuspenseWrap><RouteOptimization /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/procurement" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager']} permissions={["inventory.procure"]} showError={true}>
                        <AppLayout><SuspenseWrap><Procurement /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/warranty" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','support_agent']} permissions={["warranty.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><Warranty /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/quotes" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["quote.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><Quotes /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/invoicing" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["invoice.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><Invoicing /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/payments" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["invoice.pay"]} showError={true}>
                        <AppLayout><SuspenseWrap><Payments /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/finance" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["finance.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><Finance /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/penalties" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["penalty.calculate"]} showError={true}>
                        <AppLayout><SuspenseWrap><Penalties /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/sapos" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["sapos.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><OfferAI /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/service-orders" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher','technician']} permissions={["so.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><ServiceOrders /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/fraud" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','fraud_investigator','auditor']} permissions={["fraud.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><FraudInvestigation /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/forgery-detection" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','fraud_investigator','auditor']} permissions={["fraud.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><ForgeryDetection /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/customers" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','support_agent']} permissions={["customers.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><Customers /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/technicians" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher']} permissions={["technicians.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><Technicians /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/equipment" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','technician','partner_admin']} permissions={["equipment.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><Equipment /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/contracts" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["contracts.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><Contracts /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  {/* Customer Portal Auth - Module-specific route */}
                  <Route path="/customer-portal/auth" element={<SuspenseWrap><CustomerAuth /></SuspenseWrap>} />

                  <Route path="/customer-portal" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','customer']} permissions={["portal.access"]} showError={true}>
                        <AppLayout><SuspenseWrap><CustomerPortal /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/predictive-maintenance" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','ops_manager']} permissions={["maintenance.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><PredictiveMaintenance /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/partner-portal" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','partner_admin']} permissions={["partners.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><PartnerPortal /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/documents" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin']} permissions={["documents.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><Documents /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/templates" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin']} permissions={["admin.config"]} showError={true}>
                        <AppLayout><SuspenseWrap><Templates /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/webhooks" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["admin.config"]} showError={true}>
                        <AppLayout><SuspenseWrap><Webhooks /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/knowledge-base" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["admin.config"]} showError={true}>
                        <AppLayout><SuspenseWrap><KnowledgeBase /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/faq" element={
                    <ProtectedRoute>
                      <AppLayout><SuspenseWrap><FAQPage /></SuspenseWrap></AppLayout>
                    </ProtectedRoute>
                  } />

                  <Route path="/training" element={
                    <ProtectedRoute>
                      <AppLayout><SuspenseWrap><TrainingPlatform /></SuspenseWrap></AppLayout>
                    </ProtectedRoute>
                  } />

                  <Route path="/schedule-optimizer" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["wo.assign"]} showError={true}>
                        <AppLayout><SuspenseWrap><ScheduleOptimizer /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/nlp-query" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["admin.config"]} showError={true}>
                        <AppLayout><SuspenseWrap><NLPQueryInterface /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/custom-reports" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["audit.read"]} showError={true}>
                        <AppLayout><SuspenseWrap><CustomReportBuilder /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/maintenance-calendar" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["wo.assign"]} showError={true}>
                        <AppLayout><SuspenseWrap><MaintenanceCalendar /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/rag" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["admin.config"]} showError={true}>
                        <AppLayout><SuspenseWrap><RAGEngine /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/assistant" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["admin.config"]} showError={true}>
                        <AppLayout><SuspenseWrap><Assistant /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/models" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["mlops.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><ModelOrchestration /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/prompts" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["admin.config"]} showError={true}>
                        <AppLayout><SuspenseWrap><Prompts /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/analytics" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["audit.read"]} showError={true}>
                        <AppLayout><SuspenseWrap><Analytics /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/analytics-platform" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["analytics:view"]} showError={true}>
                        <SuspenseWrap><AnalyticsPlatform /></SuspenseWrap>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/forecast" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["audit.read"]} showError={true}>
                        <AppLayout><SuspenseWrap><ForecastCenter /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/anomaly" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["fraud.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><AnomalyDetection /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/observability" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["audit.read"]} showError={true}>
                        <AppLayout><SuspenseWrap><Observability /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/agent-dashboard" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["admin.config"]} showError={true}>
                        <AppLayout><SuspenseWrap><AgentDashboard /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/developer-console" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["admin.config"]} showError={true}>
                        <AppLayout><SuspenseWrap><DeveloperConsole /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/platform-metrics" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin"]} showError={true}>
                        <AppLayout><SuspenseWrap><PlatformMetrics /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/analytics-integrations" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["admin.config"]} showError={true}>
                        <AppLayout><SuspenseWrap><AnalyticsIntegrations /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/help" element={
                    <ProtectedRoute>
                      <AppLayout><SuspenseWrap><HelpTraining /></SuspenseWrap></AppLayout>
                    </ProtectedRoute>
                  } />

                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <AppLayout><SuspenseWrap><Settings /></SuspenseWrap></AppLayout>
                    </ProtectedRoute>
                  } />

                  <Route path="/access-denied" element={
                    <ProtectedRoute>
                      <AppLayout><SuspenseWrap><AccessDenied /></SuspenseWrap></AppLayout>
                    </ProtectedRoute>
                  } />

                  <Route path="/marketplace" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["admin.config"]} showError={true}>
                        <AppLayout><SuspenseWrap><Marketplace /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/disputes" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["finance.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><DisputeManagement /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/general-ledger" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["finance.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><GeneralLedger /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/accounts-payable" element={
                    <ProtectedRoute>
                      <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["finance.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><AccountsPayable /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/ab-tests" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["mlops.view"]} showError={true}>
                        <AppLayout><SuspenseWrap><ABTestManager /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/compliance" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["admin.config"]} showError={true}>
                        <AppLayout><SuspenseWrap><ComplianceCenter /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/compliance-dashboard" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["audit.read"]} showError={true}>
                        <AppLayout><SuspenseWrap><ComplianceDashboard /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/system-health" element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["audit.read"]} showError={true}>
                        <AppLayout><SuspenseWrap><SystemHealth /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/marketplace-management" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin"]} showError={true}>
                        <AppLayout><SuspenseWrap><MarketplaceManagement /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/developer-portal" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin", "tenant_admin", "partner_admin"]} showError={true}>
                        <AppLayout><SuspenseWrap><DeveloperPortal /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/industry-workflows" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin", "tenant_admin", "ops_manager"]} showError={true}>
                        <AppLayout><SuspenseWrap><IndustryWorkflows /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/analytics-platform-auth" element={<SuspenseWrap><AnalyticsPlatformAuth /></SuspenseWrap>} />

                  <Route path="/admin" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin", "tenant_admin"]} showError={true}>
                        <AppLayout><SuspenseWrap><AdminConsole /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/org-console" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin", "tenant_admin"]} showError={true}>
                        <AppLayout><SuspenseWrap><OrgManagementConsole /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  {/* FlowSpace — Decision Ledger */}
                  <Route path="/flowspace" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin","tenant_admin","ops_manager","finance_manager","auditor"]} permissions={["audit.read"]} showError={true}>
                        <AppLayout><SuspenseWrap><DecisionLedger /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  {/* DEX — Execution Console */}
                  <Route path="/dex" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin","tenant_admin","ops_manager"]} permissions={["wo.read"]} showError={true}>
                        <AppLayout><SuspenseWrap><ExecutionConsole /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  {/* Technician Profile */}
                  <Route path="/technician-profile/:techId" element={
                    <ProtectedRoute>
                      <AppLayout><SuspenseWrap><TechnicianProfile /></SuspenseWrap></AppLayout>
                    </ProtectedRoute>
                  } />

                  {/* Skills Admin */}
                  <Route path="/skills-admin" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin","tenant_admin","ops_manager"]} permissions={["org.manage"]} showError={true}>
                        <AppLayout><SuspenseWrap><SkillsAdmin /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  {/* Schedule Optimiser */}
                  <Route path="/schedule-optimiser" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin","tenant_admin","ops_manager"]} showError={true}>
                        <AppLayout><SuspenseWrap><ScheduleOptimiser /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  {/* Customer Self-Scheduling (public) */}
                  <Route path="/book" element={<SuspenseWrap><CustomerBooking /></SuspenseWrap>} />

                  {/* Customer 360 */}
                  <Route path="/customer360/:customerId" element={
                    <ProtectedRoute>
                      <AppLayout><SuspenseWrap><Customer360 /></SuspenseWrap></AppLayout>
                    </ProtectedRoute>
                  } />

                  {/* Comms Hub */}
                  <Route path="/comms-hub" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin","tenant_admin","ops_manager","support_agent"]} showError={true}>
                        <AppLayout><SuspenseWrap><CommsHub /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/asset-register" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin","tenant_admin","ops_manager","technician"]} showError={true}>
                        <AppLayout><SuspenseWrap><AssetRegister /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  <Route path="/connector-management" element={
                    <ProtectedRoute>
                      <RoleGuard roles={["sys_admin","tenant_admin"]} showError={true}>
                        <AppLayout><SuspenseWrap><ConnectorManagement /></SuspenseWrap></AppLayout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />

                  {/* CRM */}
                  <Route path="/crm/accounts" element={<ProtectedRoute><AppLayout><SuspenseWrap><CRMAccounts /></SuspenseWrap></AppLayout></ProtectedRoute>} />
                  <Route path="/crm/contacts" element={<ProtectedRoute><AppLayout><SuspenseWrap><CRMContacts /></SuspenseWrap></AppLayout></ProtectedRoute>} />
                  <Route path="/crm/pipeline" element={<ProtectedRoute><AppLayout><SuspenseWrap><CRMPipeline /></SuspenseWrap></AppLayout></ProtectedRoute>} />
                  <Route path="/crm/pipeline-settings" element={<ProtectedRoute><AppLayout><SuspenseWrap><CRMPipelineSettings /></SuspenseWrap></AppLayout></ProtectedRoute>} />
                  <Route path="/crm/leads" element={<ProtectedRoute><AppLayout><SuspenseWrap><CRMLeads /></SuspenseWrap></AppLayout></ProtectedRoute>} />

                  {/* Catch-all for 404 */}
                  <Route path="*" element={<SuspenseWrap><NotFound /></SuspenseWrap>} />
                </Routes>
              </Suspense>
              <Toaster richColors position="top-right" />
            </RBACProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
