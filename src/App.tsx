import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserMenu } from "@/components/UserMenu";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import WorkOrders from "./pages/WorkOrders";
import Inventory from "./pages/Inventory";
import Warranty from "./pages/Warranty";
import Penalties from "./pages/Penalties";
import PhotoCapturePage from "./pages/PhotoCapturePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <div className="flex-1 flex flex-col">
                        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-10">
                          <div className="flex items-center gap-4">
                            <SidebarTrigger />
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">ReconX AI</span>
                              <span className="text-xs text-muted-foreground hidden md:inline">
                                Enterprise Field Service Platform
                              </span>
                            </div>
                          </div>
                          <UserMenu />
                        </header>
                        <main className="flex-1 p-6 bg-background">
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/tickets" element={<Tickets />} />
                            <Route path="/work-orders" element={<WorkOrders />} />
                            <Route path="/inventory" element={<Inventory />} />
                            <Route path="/photo-capture" element={<PhotoCapturePage />} />
                            {/* Placeholder routes for other modules */}
                            <Route path="/service-orders" element={<div className="text-center py-12 text-muted-foreground">Service Orders module - Coming soon</div>} />
                            <Route path="/scheduler" element={<div className="text-center py-12 text-muted-foreground">Scheduler module - Coming soon</div>} />
                            <Route path="/dispatch" element={<div className="text-center py-12 text-muted-foreground">Dispatch module - Coming soon</div>} />
                            <Route path="/procurement" element={<div className="text-center py-12 text-muted-foreground">Procurement module - Coming soon</div>} />
                            <Route path="/warranty" element={<Warranty />} />
                            <Route path="/quotes" element={<div className="text-center py-12 text-muted-foreground">Quotes module - Coming soon</div>} />
                            <Route path="/invoicing" element={<div className="text-center py-12 text-muted-foreground">Invoicing module - Coming soon</div>} />
                            <Route path="/payments" element={<div className="text-center py-12 text-muted-foreground">Payments module - Coming soon</div>} />
                            <Route path="/settlements" element={<div className="text-center py-12 text-muted-foreground">Finance & Settlements module - Coming soon</div>} />
                            <Route path="/penalties" element={<Penalties />} />
                            <Route path="/sapos" element={<div className="text-center py-12 text-muted-foreground">SaPOS AI module - Coming soon</div>} />
                            <Route path="/knowledge-base" element={<div className="text-center py-12 text-muted-foreground">Knowledge Base module - Coming soon</div>} />
                            <Route path="/rag" element={<div className="text-center py-12 text-muted-foreground">RAG Engine module - Coming soon</div>} />
                            <Route path="/assistant" element={<div className="text-center py-12 text-muted-foreground">Assistant module - Coming soon</div>} />
                            <Route path="/models" element={<div className="text-center py-12 text-muted-foreground">Model Orchestration module - Coming soon</div>} />
                            <Route path="/prompts" element={<div className="text-center py-12 text-muted-foreground">Prompts module - Coming soon</div>} />
                            <Route path="/analytics" element={<div className="text-center py-12 text-muted-foreground">Analytics module - Coming soon</div>} />
                            <Route path="/fraud" element={<div className="text-center py-12 text-muted-foreground">Fraud Detection module - Coming soon</div>} />
                            <Route path="/anomaly" element={<div className="text-center py-12 text-muted-foreground">Anomaly Detection module - Coming soon</div>} />
                            <Route path="/observability" element={<div className="text-center py-12 text-muted-foreground">Observability module - Coming soon</div>} />
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
