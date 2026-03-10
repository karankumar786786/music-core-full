import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface InfiniteScrollContainerProps {
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  children: React.ReactNode;
  className?: string;
}

export function InfiniteScrollContainer({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  children,
  className = "",
}: InfiniteScrollContainerProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className={className}>
      {children}

      {/* Sentinel element for intersection observer */}
      <div
        ref={sentinelRef}
        className="h-10 w-full flex items-center justify-center mt-4"
      >
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-zinc-500 animate-in fade-in duration-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Loading more...</span>
          </div>
        )}
        {!hasNextPage && children && (
          <div className="text-zinc-500 text-xs font-medium py-4 opacity-50 italic">
            No more items to display
          </div>
        )}
      </div>
    </div>
  );
}
