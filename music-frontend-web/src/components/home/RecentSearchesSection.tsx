import { useQuery } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { History,  ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function RecentSearchesSection() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => musicApi.getProfile(),
    retry: false,
    enabled: !!localStorage.getItem("access_token"),
  });

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["search-history"],
    queryFn: () => musicApi.getSearchHistory(),
    enabled: !!user,
  });

  if (!user || (!isLoading && (!historyData || historyData.length === 0))) {
    return null;
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Recent Searches
          </h2>
        </div>
      </div>

      <div className="flex flex-row overflow-x-auto gap-4 pb-4 no-scrollbar">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex-none w-[200px] h-14 rounded-2xl bg-white/5 animate-pulse"
              />
            ))
          : historyData.slice(0, 10).map((history: any) => (
              <Link
                key={history.id}
                to="/search"
                search={{ q: history.searchString }}
                className="flex-none group flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-300 cursor-pointer min-w-[180px] max-w-[240px]"
              >
                <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <History className="h-4 w-4 text-zinc-500 group-hover:text-primary transition-colors" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                    {history.searchString}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">
                    Recent Search
                  </span>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}
