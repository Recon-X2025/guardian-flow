import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { RBACProvider } from "@/contexts/RBACContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AccessDenied } from "@/components/AccessDenied";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import WorkOrders from "./pages/WorkOrders";
import PendingValidation from "./pages/PendingValidation";
import Inventory from "./pages/Inventory";
import Warranty from "./pages/Warranty";
import Penalties from "./pages/Penalties";
import OfferAI from "./pages/OfferAI";
import ServiceOrders from "./pages/ServiceOrders";
import FraudInvestigation from "./pages/FraudInvestigation";
import ForgeryDetection from "./pages/ForgeryDetection";
import Finance from "./pages/Finance";
import PhotoCapturePage from "./pages/PhotoCapturePage";
import Quotes from "./pages/Quotes";
import Scheduler from "./pages/Scheduler";
import Dispatch from "./pages/Dispatch";
import Procurement from "./pages/Procurement";
import Settings from "./pages/Settings";
import AdminConsole from "./pages/AdminConsole";
import NotFound from "./pages/NotFound";
import Invoicing from "./pages/Invoicing";
import Payments from "./pages/Payments";
import Analytics from "./pages/Analytics";
import DeveloperConsole from "./pages/DeveloperConsole";
import DeveloperLanding from "./pages/DeveloperLanding";
import PlatformMetrics from "./pages/PlatformMetrics";
import AnalyticsIntegrations from "./pages/AnalyticsIntegrations";
import Observability from "./pages/Observability";
import KnowledgeBase from "./pages/KnowledgeBase";
import Assistant from "./pages/Assistant";
import ModelOrchestration from "./pages/ModelOrchestration";
import HelpTraining from "./pages/HelpTraining";
import AnomalyDetection from "./pages/AnomalyDetection";
import AgentDashboard from "./pages/AgentDashboard";
import RAGEngine from "./pages/RAGEngine";
import Prompts from "./pages/Prompts";
import ForecastCenter from "./pages/ForecastCenter";
import RouteOptimization from "./pages/RouteOptimization";
import Customers from "./pages/Customers";
import Technicians from "./pages/Technicians";
import Equipment from "./pages/Equipment";
import Contracts from "./pages/Contracts";
import CustomerPortal from "./pages/CustomerPortal";
import PredictiveMaintenance from "./pages/PredictiveMaintenance";
import PartnerPortal from "./pages/PartnerPortal";
import Documents from "./pages/Documents";
import Webhooks from "./pages/Webhooks";
import Marketplace from "./pages/Marketplace";
import DisputeManagement from "./pages/DisputeManagement";
import ABTestManager from "./pages/ABTestManager";
import SystemHealth from "./pages/SystemHealth";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import ComplianceCenter from "./pages/ComplianceCenter";
import MarketplaceManagement from "./pages/MarketplaceManagement";
import DeveloperPortal from "./pages/DeveloperPortal";
import IndustryWorkflows from "./pages/IndustryWorkflows";
import Templates from "./pages/Templates";
import Landing from "./pages/Landing";
import PricingCalculator from "./pages/PricingCalculator";
import FieldServiceModule from "./pages/modules/FieldServiceModule";
import AssetLifecycleModule from "./pages/modules/AssetLifecycleModule";
import AIForecastingModule from "./pages/modules/AIForecastingModule";
import FraudComplianceModule from "./pages/modules/FraudComplianceModule";
import MarketplaceModule from "./pages/modules/MarketplaceModule";
import AnalyticsBIModule from "./pages/modules/AnalyticsBIModule";
import CustomerPortalModule from "./pages/modules/CustomerPortalModule";
import VideoTrainingModule from "./pages/modules/VideoTrainingModule";
import AnalyticsPlatformModule from "./pages/modules/AnalyticsPlatformModule";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import AnalyticsPlatform from "./pages/AnalyticsPlatform";
import AnalyticsPlatformAuth from "./pages/AnalyticsPlatformAuth";
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
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/developer" element={<DeveloperLanding />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <AppLayout><Dashboard /></AppLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/tickets" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["ticket.read"]} showError={true}>
                      <AppLayout><Tickets /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/work-orders" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["wo.read"]} showError={true}>
                      <AppLayout><WorkOrders /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/pending-validation" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["wo.read"]} showError={true}>
                      <AppLayout><PendingValidation /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/inventory" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["inventory.view"]} showError={true}>
                      <AppLayout><Inventory /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/photo-capture" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["attachment.upload"]} showError={true}>
                      <AppLayout><PhotoCapturePage /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/scheduler" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["wo.assign"]} showError={true}>
                      <AppLayout><Scheduler /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/dispatch" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["wo.assign"]} showError={true}>
                      <AppLayout><Dispatch /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/route-optimization" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["wo.assign"]} showError={true}>
                      <AppLayout><RouteOptimization /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/procurement" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["inventory.procure"]} showError={true}>
                      <AppLayout><Procurement /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/warranty" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["warranty.view"]} showError={true}>
                      <AppLayout><Warranty /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/quotes" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["quote.view"]} showError={true}>
                      <AppLayout><Quotes /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/invoicing" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["invoice.view"]} showError={true}>
                      <AppLayout><Invoicing /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/payments" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["invoice.pay"]} showError={true}>
                      <AppLayout><Payments /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/finance" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["finance.view"]} showError={true}>
                      <AppLayout><Finance /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/penalties" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["penalty.calculate"]} showError={true}>
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
                    <RoleGuard permissions={["so.view"]} showError={true}>
                      <AppLayout><ServiceOrders /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/fraud" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["fraud.view"]} showError={true}>
                      <AppLayout><FraudInvestigation /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/forgery-detection" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["fraud.view"]} showError={true}>
                      <AppLayout><ForgeryDetection /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/customers" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["customers.view"]} showError={true}>
                      <AppLayout><Customers /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/technicians" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["technicians.view"]} showError={true}>
                      <AppLayout><Technicians /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/equipment" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["equipment.view"]} showError={true}>
                      <AppLayout><Equipment /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/contracts" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["contracts.view"]} showError={true}>
                      <AppLayout><Contracts /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/customer-portal" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["portal.access"]} showError={true}>
                      <AppLayout><CustomerPortal /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/predictive-maintenance" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["maintenance.view"]} showError={true}>
                      <AppLayout><PredictiveMaintenance /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/partner-portal" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["partners.view"]} showError={true}>
                      <AppLayout><PartnerPortal /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/documents" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["documents.view"]} showError={true}>
                      <AppLayout><Documents /></AppLayout>
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/templates" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["admin.config"]} showError={true}>
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
                
                <Route path="/analytics-platform" element={
                  <ProtectedRoute>
                    <RoleGuard permissions={["audit.read"]} showError={true}>
                      <AnalyticsPlatform />
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
