import { ReactNode, useState, useEffect } from 'react';
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/domains/shared/components/AppSidebar";
import { UserMenu } from "@/domains/shared/components/UserMenu";
import { AICopilotWidget } from "@/domains/shared/components/AICopilotWidget";
import { InstallPrompt } from "@/domains/shared/components/InstallPrompt";
import OfflineSyncIndicator from "@/domains/shared/components/OfflineSyncIndicator";

export function AppLayout({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const go    = () => setIsOnline(true);
    const leave = () => setIsOnline(false);
    window.addEventListener('online',  go);
    window.addEventListener('offline', leave);
    return () => {
      window.removeEventListener('online',  go);
      window.removeEventListener('offline', leave);
    };
  }, []);
  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full flex-col">
          {!isOnline && (
            <div style={{ background: '#f59e0b', color: '#000', padding: '8px 16px', textAlign: 'center', fontSize: '14px' }}>
              ⚠ You are offline. Some features may be unavailable.
            </div>
          )}
          <div className="flex flex-1 w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <header className="h-12 sm:h-14 border-b border-border bg-card flex items-center justify-between px-3 sm:px-4 sticky top-0 z-10">
                <div className="flex items-center gap-2 sm:gap-4">
                  <SidebarTrigger />
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm font-semibold">Guardian Flow</span>
                    <span className="text-xs text-muted-foreground hidden md:inline">
                      Enterprise Field Service Platform
                    </span>
                  </div>
                </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex">
                  <OfflineSyncIndicator />
                </div>
                <UserMenu />
              </div>
            </header>
            <main className="flex-1 p-3 sm:p-4 md:p-6 bg-background">
              {children}
            </main>
        </div>
        <AICopilotWidget />
        <InstallPrompt />
      </SidebarProvider>
    </TooltipProvider>
  );
}
