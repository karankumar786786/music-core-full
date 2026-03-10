import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ListMusic } from "lucide-react";

export const Route = createFileRoute("/user-playlists/")({
  component: UserPlaylistsView,
});

function UserPlaylistsView() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => musicApi.getProfile(),
    retry: false,
    staleTime: Infinity,
    enabled: !!localStorage.getItem("access_token"),
  });

  const { data: myData, isLoading: myLoading } = useQuery({
    queryKey: ["userPlaylists"],
    queryFn: () => musicApi.getUserPlaylists(),
    enabled: !!user,
  });

  const myPlaylists = myData?.data || [];

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <p className="text-lg">Please login to view your playlists</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          Your Playlists
        </h1>
        <p className="text-zinc-500">Your personal collections</p>
      </div>

      <div className="flex flex-col">
        {myLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-6 p-5 border-b border-zinc-900/50"
              >
                <Skeleton className="h-20 w-20 rounded-lg bg-zinc-900" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-1/3 bg-zinc-900" />
                  <Skeleton className="h-4 w-1/2 bg-zinc-900" />
                </div>
              </div>
            ))
          : myPlaylists.map((playlist: any) => (
              <Link
                key={playlist.id}
                to="/user-playlists/$playlistId"
                params={{ playlistId: playlist.id }}
                className="group flex items-center justify-between p-5 rounded-2xl hover:bg-zinc-800/50 transition-all duration-200 cursor-pointer border-b border-zinc-900/50"
              >
                <div className="flex items-center gap-6 flex-1">
                  <div className="relative h-20 w-20 shrink-0 shadow-2xl">
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-xl border border-white/5 group-hover:border-primary/20 transition-colors">
                      <ListMusic className="h-10 w-10 text-zinc-700 group-hover:text-primary transition-colors" />
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0 space-y-1">
                    <h3 className="text-white font-bold text-lg truncate group-hover:text-primary transition-colors capitalize">
                      {playlist.title}
                    </h3>
                    <p className="text-zinc-500 text-sm font-medium line-clamp-1">
                      My Playlist • {playlist.songs?.length || 0} Songs
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-4 hidden sm:block">
                  <p className="text-zinc-500 text-xs font-semibold group-hover:text-primary transition-colors uppercase tracking-widest">
                    Your List
                  </p>
                </div>
              </Link>
            ))}
      </div>

      {!myLoading && myPlaylists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-lg">You haven't created any playlists yet</p>
        </div>
      )}
    </div>
  );
}
