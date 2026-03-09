import * as React from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import AdminSidebar from "@/components/custom/AdminSidebar";
import AdminNavbar from "@/components/custom/AdminNavbar";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen w-full bg-background overflow-hidden font-sans antialiased text-foreground">
        {/* Admin Sidebar */}
        <AdminSidebar />

        {/* Admin Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Admin Header/Navbar */}
          <AdminNavbar />

          {/* Admin Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>

      <Toaster position="top-right" richColors />
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
