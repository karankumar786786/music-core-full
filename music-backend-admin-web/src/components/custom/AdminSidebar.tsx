import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Music,
  UserSquare2,
  ListMusic,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@tanstack/react-store";
import { adminStore, adminActions } from "@/Store/adminStore";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Songs", href: "/songs", icon: Music },
  { name: "Artists", href: "/artists", icon: UserSquare2 },
  { name: "Playlists", href: "/playlists", icon: ListMusic },
];

export default function AdminSidebar() {
  const { isSidebarOpen } = useStore(adminStore, (s) => s);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-card transition-all duration-300",
        isSidebarOpen ? "w-64" : "w-20",
      )}
    >
      <div className="flex h-16 items-center justify-between px-6 border-b">
        <div
          className={cn(
            "flex items-center gap-2 font-bold transition-opacity",
            !isSidebarOpen && "opacity-0 invisible w-0",
          )}
        >
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            M
          </div>
          <span>ADMIN</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={adminActions.toggleSidebar}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground group"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span
                className={cn(
                  "transition-all",
                  !isSidebarOpen && "opacity-0 invisible w-0",
                )}
              >
                {item.name}
              </span>
            </Link>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t mt-auto">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50",
            !isSidebarOpen && "px-2",
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className={cn(!isSidebarOpen && "hidden")}>Logout</span>
        </Button>
      </div>
    </aside>
  );
}
