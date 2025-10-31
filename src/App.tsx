import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { RBACProvider } from "@/contexts/RBACContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import { UserMenu } from "@/components/UserMenu";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AccessDenied } from "@/components/AccessDenied";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import WorkOrders from "./pages/WorkOrders";
import PendingValidation from "./pages/PendingValidation";
import Inventory from "./pages/Inventory";
import Warranty from "./pages/Warranty";
import Penalties from "./pages/Penalties";
import SaPOS from "./pages/SaPOS";
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
import NotFound from "./pages/NotFound";
import Invoicing from "./pages/Invoicing";
import Payments from "./pages/Payments";
import Analytics from "./pages/Analytics";
import DeveloperConsole from "./pages/DeveloperConsole";
import DeveloperLanding from "./pages/DeveloperLanding";
import PlatformMetrics from "./pages/PlatformMetrics";
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
import ProductSpecs from "./pages/ProductSpecs";
import RouteOptimization from "./pages/RouteOptimization";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <RBACProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/developer" element={<DeveloperLanding />} />
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <SidebarProvider>
                        <div className="min-h-screen flex w-full">
                          <AppSidebar />
                          <div className="flex-1 flex flex-col">
                            <header className="h-12 sm:h-14 border-b border-border bg-card flex items-center justify-between px-3 sm:px-4 sticky top-0 z-10">
                              <div className="flex items-center gap-2 sm:gap-4">
                                <SidebarTrigger />
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <span className="text-xs sm:text-sm font-semibold">ReconX AI</span>
                                  <span className="text-xs text-muted-foreground hidden md:inline">
                                    Enterprise Field Service Platform
                                  </span>
                                </div>
                              </div>
                              <UserMenu />
                            </header>
                            <main className="flex-1 p-3 sm:p-4 md:p-6 bg-background">
                              <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/tickets" element={
                                  <RoleGuard permissions={["ticket.read"]} showError={true}>
                                    <Tickets />
                                  </RoleGuard>
                                } />
                                <Route path="/work-orders" element={
                                  <RoleGuard permissions={["wo.read"]} showError={true}>
                                    <WorkOrders />
                                  </RoleGuard>
                                } />
                                <Route path="/pending-validation" element={
                                  <RoleGuard permissions={["wo.read"]} showError={true}>
                                    <PendingValidation />
                                  </RoleGuard>
                                } />
                                <Route path="/inventory" element={
                                  <RoleGuard permissions={["inventory.view"]} showError={true}>
                                    <Inventory />
                                  </RoleGuard>
                                } />
                                <Route path="/photo-capture" element={
                                  <RoleGuard permissions={["attachment.upload"]} showError={true}>
                                    <PhotoCapturePage />
                                  </RoleGuard>
                                } />
                                <Route path="/scheduler" element={
                                  <RoleGuard permissions={["wo.assign"]} showError={true}>
                                    <Scheduler />
                                  </RoleGuard>
                                 } />
                                 <Route path="/dispatch" element={
                                   <RoleGuard permissions={["wo.assign"]} showError={true}>
                                     <Dispatch />
                                   </RoleGuard>
                                 } />
                                 <Route path="/route-optimization" element={
                                   <RoleGuard permissions={["wo.assign"]} showError={true}>
                                     <RouteOptimization />
                                   </RoleGuard>
                                 } />
                                 <Route path="/procurement" element={
                                  <RoleGuard permissions={["inventory.procure"]} showError={true}>
                                    <Procurement />
                                  </RoleGuard>
                                } />
                                <Route path="/warranty" element={
                                  <RoleGuard permissions={["warranty.view"]} showError={true}>
                                    <Warranty />
                                  </RoleGuard>
                                } />
                                <Route path="/quotes" element={
                                  <RoleGuard permissions={["quote.view"]} showError={true}>
                                    <Quotes />
                                  </RoleGuard>
                                } />
                                <Route path="/invoicing" element={
                                  <RoleGuard permissions={["invoice.view"]} showError={true}>
                                    <Invoicing />
                                  </RoleGuard>
                                } />
                                <Route path="/payments" element={
                                  <RoleGuard permissions={["invoice.pay"]} showError={true}>
                                    <Payments />
                                  </RoleGuard>
                                } />
                                <Route path="/finance" element={
                                  <RoleGuard permissions={["finance.view"]} showError={true}>
                                    <Finance />
                                  </RoleGuard>
                                } />
                                <Route path="/penalties" element={
                                  <RoleGuard permissions={["penalty.calculate"]} showError={true}>
                                    <Penalties />
                                  </RoleGuard>
                                } />
                                <Route path="/sapos" element={
                                  <RoleGuard permissions={["sapos.view"]} showError={true}>
                                    <SaPOS />
                                  </RoleGuard>
                                } />
                                <Route path="/service-orders" element={
                                  <RoleGuard permissions={["so.view"]} showError={true}>
                                    <ServiceOrders />
                                  </RoleGuard>
                                } />
                                <Route path="/fraud" element={
                                  <RoleGuard permissions={["fraud.view"]} showError={true}>
                                    <FraudInvestigation />
                                  </RoleGuard>
                                } />
                                <Route path="/knowledge-base" element={
                                  <RoleGuard permissions={["admin.config"]} showError={true}>
                                    <KnowledgeBase />
                                  </RoleGuard>
                                } />
                                <Route path="/rag" element={
                                  <RoleGuard permissions={["admin.config"]} showError={true}>
                                    <RAGEngine />
                                  </RoleGuard>
                                } />
                                <Route path="/assistant" element={
                                  <RoleGuard permissions={["admin.config"]} showError={true}>
                                    <Assistant />
                                  </RoleGuard>
                                } />
                                <Route path="/models" element={
                                  <RoleGuard permissions={["mlops.view"]} showError={true}>
                                    <ModelOrchestration />
                                  </RoleGuard>
                                } />
                                <Route path="/prompts" element={
                                  <RoleGuard permissions={["admin.config"]} showError={true}>
                                    <Prompts />
                                  </RoleGuard>
                                } />
                                <Route path="/analytics" element={
                                  <RoleGuard permissions={["audit.read"]} showError={true}>
                                    <Analytics />
                                  </RoleGuard>
                                } />
                                <Route path="/forecast" element={
                                  <RoleGuard permissions={["audit.read"]} showError={true}>
                                    <ForecastCenter />
                                  </RoleGuard>
                                } />
                                <Route path="/anomaly" element={
                                  <RoleGuard permissions={["fraud.view"]} showError={true}>
                                    <AnomalyDetection />
                                  </RoleGuard>
                                } />
                                <Route path="/observability" element={
                                  <RoleGuard permissions={["audit.read"]} showError={true}>
                                    <Observability />
                                  </RoleGuard>
                                } />
                                <Route path="/agent-dashboard" element={
                                  <RoleGuard permissions={["admin.config"]} showError={true}>
                                    <AgentDashboard />
                                  </RoleGuard>
                                } />
                                <Route path="/product-specs" element={<ProductSpecs />} />
                                <Route path="/developer-console" element={
                                  <RoleGuard permissions={["admin.config"]} showError={true}>
                                    <DeveloperConsole />
                                  </RoleGuard>
                                } />
                                <Route path="/platform-metrics" element={
                                  <RoleGuard roles={["sys_admin"]} showError={true}>
                                    <PlatformMetrics />
                                  </RoleGuard>
                                } />
                                <Route path="/help" element={<HelpTraining />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/access-denied" element={<AccessDenied />} />
                                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </main>
                          </div>
                        </div>
                      </SidebarProvider>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </RBACProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
