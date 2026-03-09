import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Leftside from "@/components/custom/Leftside";
import RightSide from "@/components/custom/RightSide";
import Navbar from "@/components/custom/Navbar";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex h-screen w-full bg-black overflow-hidden font-sans antialiased text-foreground">
          {/* Left Sidebar */}
          <Leftside />

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden border-r border-white/5">
            {/* Header/Navbar */}
            <div className="flex-none">
              <Navbar />
            </div>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto p-6 no-scrollbar min-h-0">
              <Outlet />
            </main>
          </div>

          {/* Right Sidebar (Player & Lyrics) */}
          <RightSide />
        </div>

        <Toaster position="top-center" richColors />
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-left" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
