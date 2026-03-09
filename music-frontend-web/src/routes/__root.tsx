import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Leftside from "@/components/custom/Leftside";
import RightSide from "@/components/custom/RightSide";
import Navbar from "@/components/custom/Navbar";
import { musicApi } from "@/lib/api";
import AuthModal from "@/components/custom/AuthModal";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: RootComponent,
});

function MainLayout() {
  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["me"],
    queryFn: () => musicApi.getMe(),
    retry: false,
    staleTime: Infinity,
    enabled: !!localStorage.getItem("access_token"),
  });

  const isAuthenticated = !!user;

  if (!isAuthenticated && !isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black p-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px] absolute -top-24 -left-24" />
          <div className="h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] absolute -bottom-24 -right-24" />
        </div>
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          isClosable={false}
          onSuccess={() => refetch()}
        />
      </div>
    );
  }

  return (
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
  );
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MainLayout />
        <Toaster position="top-center" richColors />
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-left" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
