import { type ReactNode } from "react";
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
import Auth from "@/domains/auth/pages/Auth";
import Dashboard from "@/domains/shared/pages/Dashboard";
import Tickets from "@/domains/tickets/pages/Tickets";
import WorkOrders from "@/domains/workOrders/pages/WorkOrders";
import PendingValidation from "@/domains/shared/pages/PendingValidation";
import Inventory from "@/domains/inventory/pages/Inventory";
import Warranty from "@/domains/financial/pages/Warranty";
import Penalties from "@/domains/financial/pages/Penalties";
import OfferAI from "@/domains/shared/pages/OfferAI";
import ServiceOrders from "@/domains/workOrders/pages/ServiceOrders";
import FraudInvestigation from "@/domains/fraud/pages/FraudInvestigation";
import ForgeryDetection from "@/domains/fraud/pages/ForgeryDetection";
import Finance from "@/domains/financial/pages/Finance";
import PhotoCapturePage from "@/domains/shared/pages/PhotoCapturePage";
import Quotes from "@/domains/financial/pages/Quotes";
import Scheduler from "@/domains/workOrders/pages/Scheduler";
import Dispatch from "@/domains/workOrders/pages/Dispatch";
import Procurement from "@/domains/inventory/pages/Procurement";
import Settings from "@/domains/shared/pages/Settings";
import AdminConsole from "@/domains/shared/pages/AdminConsole";
import NotFound from "@/domains/shared/pages/NotFound";
import Invoicing from "@/domains/financial/pages/Invoicing";
import Payments from "@/domains/financial/pages/Payments";
import Analytics from "@/domains/analytics/pages/Analytics";
import DeveloperConsole from "@/domains/shared/pages/DeveloperConsole";
import DeveloperLanding from "@/domains/shared/pages/DeveloperLanding";
import PlatformMetrics from "@/domains/analytics/pages/PlatformMetrics";
import AnalyticsIntegrations from "@/domains/analytics/pages/AnalyticsIntegrations";
import Observability from "@/domains/shared/pages/Observability";
import KnowledgeBase from "@/domains/knowledge/pages/KnowledgeBase";
import FAQPage from "@/domains/knowledge/pages/FAQPage";
import Assistant from "@/domains/shared/pages/Assistant";
import ModelOrchestration from "@/domains/shared/pages/ModelOrchestration";
import HelpTraining from "@/domains/training/pages/HelpTraining";
import AnomalyDetection from "@/domains/analytics/pages/AnomalyDetection";
import AgentDashboard from "@/domains/shared/pages/AgentDashboard";
import RAGEngine from "@/domains/knowledge/pages/RAGEngine";
import Prompts from "@/domains/shared/pages/Prompts";
import ForecastCenter from "@/domains/analytics/pages/ForecastCenter";
import RouteOptimization from "@/domains/workOrders/pages/RouteOptimization";
import Customers from "@/domains/customers/pages/Customers";
import Technicians from "@/domains/shared/pages/Technicians";
import Equipment from "@/domains/inventory/pages/Equipment";
import Contracts from "@/domains/shared/pages/Contracts";
import CustomerPortal from "@/domains/customers/pages/CustomerPortal";
import PredictiveMaintenance from "@/domains/workOrders/pages/PredictiveMaintenance";
import PartnerPortal from "@/domains/customers/pages/PartnerPortal";
import Documents from "@/domains/shared/pages/Documents";
import Webhooks from "@/domains/shared/pages/Webhooks";
import Marketplace from "@/domains/marketplace/pages/Marketplace";
import DisputeManagement from "@/domains/financial/pages/DisputeManagement";
import ABTestManager from "@/domains/shared/pages/ABTestManager";
import SystemHealth from "@/domains/shared/pages/SystemHealth";
import ComplianceDashboard from "@/domains/fraud/pages/ComplianceDashboard";
import ComplianceCenter from "@/domains/fraud/pages/ComplianceCenter";
import MarketplaceManagement from "@/domains/marketplace/pages/MarketplaceManagement";
import DeveloperPortal from "@/domains/shared/pages/DeveloperPortal";
import IndustryWorkflows from "@/domains/shared/pages/IndustryWorkflows";
import Templates from "@/domains/shared/pages/Templates";
import Landing from "@/domains/shared/pages/Landing";
import PricingCalculator from "@/domains/financial/pages/PricingCalculator";
import FieldServiceModule from "./pages/modules/FieldServiceModule";
import AssetLifecycleModule from "./pages/modules/AssetLifecycleModule";
import AIForecastingModule from "./pages/modules/AIForecastingModule";
import FraudComplianceModule from "./pages/modules/FraudComplianceModule";
import MarketplaceModule from "./pages/modules/MarketplaceModule";
import AnalyticsBIModule from "./pages/modules/AnalyticsBIModule";
import CustomerPortalModule from "./pages/modules/CustomerPortalModule";
import VideoTrainingModule from "./pages/modules/VideoTrainingModule";
import AnalyticsPlatformModule from "./pages/modules/AnalyticsPlatformModule";
import Contact from "@/domains/shared/pages/Contact";
import Privacy from "@/domains/shared/pages/Privacy";
import Terms from "@/domains/shared/pages/Terms";
import AnalyticsPlatform from "@/domains/analytics/pages/AnalyticsPlatform";
import AnalyticsPlatformAuth from "@/domains/analytics/pages/AnalyticsPlatformAuth";
import IndustryOnboarding from "@/domains/shared/pages/IndustryOnboarding";
import ImageForensicsModule from "./pages/modules/ImageForensicsModule";
import EnhancedSchedulerModule from "./pages/modules/EnhancedSchedulerModule";
import AdvancedComplianceModule from "./pages/modules/AdvancedComplianceModule";
import UnifiedPlatformAuth from "@/domains/auth/pages/auth/UnifiedPlatformAuth";
import FSMAuth from "@/domains/auth/pages/auth/FSMAuth";
import AssetAuth from "@/domains/auth/pages/auth/AssetAuth";
import ForecastingAuth from "@/domains/auth/pages/auth/ForecastingAuth";
import FraudAuth from "@/domains/auth/pages/auth/FraudAuth";
import MarketplaceAuth from "@/domains/auth/pages/auth/MarketplaceAuth";
import AnalyticsAuth from "@/domains/auth/pages/auth/AnalyticsAuth";
import CustomerAuth from "@/domains/auth/pages/auth/CustomerAuth";
import TrainingAuth from "@/domains/auth/pages/auth/TrainingAuth";
import TrainingPlatform from "@/domains/training/pages/TrainingPlatform";
import ScheduleOptimizer from "@/domains/workOrders/pages/ScheduleOptimizer";
import NLPQueryInterface from "@/domains/shared/pages/NLPQueryInterface";
import CustomReportBuilder from "@/domains/analytics/pages/CustomReportBuilder";
import MaintenanceCalendar from "@/domains/workOrders/pages/MaintenanceCalendar";
import { Toaster } from '@/components/ui/sonner';

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <RBACProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/pricing-calculator" element={<PricingCalculator />} />
                <Route path="/modules/field-service" element={<FieldServiceModule />} />
                <Route path="/modules/asset-lifecycle" element={<AssetLifecycleModule />} />
                <Route path="/modules/ai-forecasting" element={<AIForecastingModule />} />
                <Route path="/modules/fraud-compliance" element={<FraudComplianceModule />} />
                <Route path="/modules/marketplace" element={<MarketplaceModule />} />
                <Route path="/modules/analytics-bi" element={<AnalyticsBIModule />} />
                <Route path="/modules/customer-portal" element={<CustomerPortalModule />} />
                <Route path="/modules/video-training" element={<VideoTrainingModule />} />
                <Route path="/modules/analytics-platform" element={<AnalyticsPlatformModule />} />
                <Route path="/modules/image-forensics" element={<ImageForensicsModule />} />
                <Route path="/modules/enhanced-scheduler" element={<EnhancedSchedulerModule />} />
                <Route path="/modules/advanced-compliance" element={<AdvancedComplianceModule />} />
                <Route path="/industry-onboarding" element={<IndustryOnboarding />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />

                {/* Authentication Routes - Module-Specific FIRST (more specific routes before generic) */}
                <Route path="/auth/fsm" element={<FSMAuth />} />
                <Route path="/auth/asset" element={<AssetAuth />} />
                <Route path="/auth/forecasting" element={<ForecastingAuth />} />
                <Route path="/auth/fraud" element={<FraudAuth />} />
                <Route path="/auth/marketplace" element={<MarketplaceAuth />} />
                <Route path="/auth/analytics" element={<AnalyticsAuth />} />
                <Route path="/auth/customer" element={<CustomerAuth />} />
                <Route path="/auth/training" element={<TrainingAuth />} />
                <Route path="/auth/platform" element={<UnifiedPlatformAuth />} />
                {/* Generic /auth route must come LAST */}
                <Route path="/auth" element={<UnifiedPlatformAuth />} />
                <Route path="/developer" element={<DeveloperLanding />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <AppLayout><Dashboard /></AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/tickets" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher','technician','support_agent']} permissions={["ticket.read"]} showError={true}>
                      <AppLayout><Tickets /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/work-orders" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher','technician','partner_admin']} permissions={["wo.read"]} showError={true}>
                      <AppLayout><WorkOrders /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/pending-validation" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher']} permissions={["wo.read"]} showError={true}>
                      <AppLayout><PendingValidation /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/inventory" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','partner_admin']} permissions={["inventory.view"]} showError={true}>
                      <AppLayout><Inventory /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/photo-capture" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher','technician']} permissions={["attachment.upload"]} showError={true}>
                      <AppLayout><PhotoCapturePage /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/scheduler" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher']} permissions={["wo.assign"]} showError={true}>
                      <AppLayout><Scheduler /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/dispatch" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher']} permissions={["wo.assign"]} showError={true}>
                      <AppLayout><Dispatch /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/route-optimization" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher']} permissions={["wo.assign"]} showError={true}>
                      <AppLayout><RouteOptimization /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/procurement" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager']} permissions={["inventory.procure"]} showError={true}>
                      <AppLayout><Procurement /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/warranty" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','support_agent']} permissions={["warranty.view"]} showError={true}>
                      <AppLayout><Warranty /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/quotes" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["quote.view"]} showError={true}>
                      <AppLayout><Quotes /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/invoicing" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["invoice.view"]} showError={true}>
                      <AppLayout><Invoicing /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/payments" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["invoice.pay"]} showError={true}>
                      <AppLayout><Payments /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/finance" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["finance.view"]} showError={true}>
                      <AppLayout><Finance /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/penalties" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["penalty.calculate"]} showError={true}>
                      <AppLayout><Penalties /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/sapos" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["sapos.view"]} showError={true}>
                      <AppLayout><OfferAI /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/service-orders" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher','technician']} permissions={["so.view"]} showError={true}>
                      <AppLayout><ServiceOrders /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/fraud" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','fraud_investigator','auditor']} permissions={["fraud.view"]} showError={true}>
                      <AppLayout><FraudInvestigation /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/forgery-detection" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','fraud_investigator','auditor']} permissions={["fraud.view"]} showError={true}>
                      <AppLayout><ForgeryDetection /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/customers" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','support_agent']} permissions={["customers.view"]} showError={true}>
                      <AppLayout><Customers /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/technicians" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','dispatcher']} permissions={["technicians.view"]} showError={true}>
                      <AppLayout><Technicians /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/equipment" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager','technician','partner_admin']} permissions={["equipment.view"]} showError={true}>
                      <AppLayout><Equipment /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/contracts" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','finance_manager']} permissions={["contracts.view"]} showError={true}>
                      <AppLayout><Contracts /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                {/* Customer Portal Auth - Module-specific route */}
                <Route path="/customer-portal/auth" element={<CustomerAuth />} />

                <Route path="/customer-portal" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','customer']} permissions={["portal.access"]} showError={true}>
                      <AppLayout><CustomerPortal /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/predictive-maintenance" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','ops_manager']} permissions={["maintenance.view"]} showError={true}>
                      <AppLayout><PredictiveMaintenance /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/partner-portal" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin','partner_admin']} permissions={["partners.view"]} showError={true}>
                      <AppLayout><PartnerPortal /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/documents" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin']} permissions={["documents.view"]} showError={true}>
                      <AppLayout><Documents /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/templates" element={
                  <ProtectedRoute>
                    <RoleGuard roles={['sys_admin','tenant_admin']} permissions={["admin.config"]} showError={true}>
                      <AppLayout><Templates /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/webhooks" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["admin.config"]} showError={true}>
                      <AppLayout><Webhooks /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/knowledge-base" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["admin.config"]} showError={true}>
                      <AppLayout><KnowledgeBase /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/faq" element={
                  <ProtectedRoute>
                    <AppLayout><FAQPage /></AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/training" element={
                  <ProtectedRoute>
                    <AppLayout><TrainingPlatform /></AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/schedule-optimizer" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["wo.assign"]} showError={true}>
                      <AppLayout><ScheduleOptimizer /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/nlp-query" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["admin.config"]} showError={true}>
                      <AppLayout><NLPQueryInterface /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/custom-reports" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["audit.read"]} showError={true}>
                      <AppLayout><CustomReportBuilder /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/maintenance-calendar" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["wo.assign"]} showError={true}>
                      <AppLayout><MaintenanceCalendar /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/rag" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["admin.config"]} showError={true}>
                      <AppLayout><RAGEngine /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/assistant" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["admin.config"]} showError={true}>
                      <AppLayout><Assistant /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/models" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["mlops.view"]} showError={true}>
                      <AppLayout><ModelOrchestration /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/prompts" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["admin.config"]} showError={true}>
                      <AppLayout><Prompts /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/analytics" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["audit.read"]} showError={true}>
                      <AppLayout><Analytics /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/analytics-platform" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["analytics:view"]} showError={true}>
                      <AnalyticsPlatform />
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/forecast" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["audit.read"]} showError={true}>
                      <AppLayout><ForecastCenter /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/anomaly" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["fraud.view"]} showError={true}>
                      <AppLayout><AnomalyDetection /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/observability" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["audit.read"]} showError={true}>
                      <AppLayout><Observability /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/agent-dashboard" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["admin.config"]} showError={true}>
                      <AppLayout><AgentDashboard /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/developer-console" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["admin.config"]} showError={true}>
                      <AppLayout><DeveloperConsole /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/platform-metrics" element={
                  <ProtectedRoute>
                    <RoleGuard roles={["sys_admin"]} showError={true}>
                      <AppLayout><PlatformMetrics /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/analytics-integrations" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["admin.config"]} showError={true}>
                      <AppLayout><AnalyticsIntegrations /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/help" element={
                  <ProtectedRoute>
                    <AppLayout><HelpTraining /></AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/settings" element={
                  <ProtectedRoute>
                    <AppLayout><Settings /></AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/access-denied" element={
                  <ProtectedRoute>
                    <AppLayout><AccessDenied /></AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/marketplace" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["admin.config"]} showError={true}>
                      <AppLayout><Marketplace /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/disputes" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["finance.view"]} showError={true}>
                      <AppLayout><DisputeManagement /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/ab-tests" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["mlops.view"]} showError={true}>
                      <AppLayout><ABTestManager /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/compliance" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["admin.config"]} showError={true}>
                      <AppLayout><ComplianceCenter /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/compliance-dashboard" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["audit.read"]} showError={true}>
                      <AppLayout><ComplianceDashboard /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/system-health" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["audit.read"]} showError={true}>
                      <AppLayout><SystemHealth /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/marketplace-management" element={
                  <ProtectedRoute>
                    <RoleGuard roles={["sys_admin"]} showError={true}>
                      <AppLayout><MarketplaceManagement /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/developer-portal" element={
                  <ProtectedRoute>
                    <RoleGuard roles={["sys_admin", "tenant_admin", "partner_admin"]} showError={true}>
                      <AppLayout><DeveloperPortal /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/industry-workflows" element={
                  <ProtectedRoute>
                    <RoleGuard roles={["sys_admin", "tenant_admin", "ops_manager"]} showError={true}>
                      <AppLayout><IndustryWorkflows /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                <Route path="/analytics-platform-auth" element={<AnalyticsPlatformAuth />} />

                <Route path="/admin" element={
                  <ProtectedRoute>
                    <RoleGuard roles={["sys_admin", "tenant_admin"]} showError={true}>
                      <AppLayout><AdminConsole /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />

                {/* Catch-all for 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster richColors position="top-right" />
            </RBACProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
