import { ReactNode } from 'react';
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { UserMenu } from "@/components/UserMenu";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
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
              <UserMenu />
            </header>
            <main className="flex-1 p-3 sm:p-4 md:p-6 bg-background">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
