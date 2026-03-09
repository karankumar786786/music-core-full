import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Music,
  Users,
  ListMusic,
  PlayCircle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const stats = [
    {
      name: "Total Songs",
      value: "1,284",
      icon: Music,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      name: "Active Artists",
      value: "342",
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      name: "Playlists",
      value: "56",
      icon: ListMusic,
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
    {
      name: "Total Streams",
      value: "45.2K",
      icon: PlayCircle,
      color: "text-green-500",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back. Here's what's happening with your music library today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="shadow-sm border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <div className={`${stat.bg} ${stat.color} p-2 rounded-lg`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500 font-medium">+12%</span> from
                last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-sm border-muted/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest uploads and modifications.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              View More <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                    <Music className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">
                      Neon Nights Volume {i}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded 2 hours ago
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm border-muted/60">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Shortcut to frequent management tasks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start gap-3 h-11"
              variant="outline"
            >
              <Plus className="h-4 w-4" /> Import Bulk Media
            </Button>
            <Button
              className="w-full justify-start gap-3 h-11"
              variant="outline"
            >
              <Plus className="h-4 w-4" /> New Artist Profile
            </Button>
            <Button
              className="w-full justify-start gap-3 h-11"
              variant="outline"
            >
              <TrendingUp className="h-4 w-4" /> Run Analytics Report
            </Button>
            <Button
              className="w-full justify-start gap-3 h-11"
              variant="outline"
            >
              <Settings className="h-4 w-4" /> System Health Check
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
