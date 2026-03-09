import React from "react";
import { Clock3 } from "lucide-react";

function SongHeader() {
  return (
    <div className="grid grid-cols-[16px_48px_1fr_80px] gap-4 px-4 py-2 border-b border-zinc-800/50 text-zinc-500 text-xs uppercase tracking-wider mb-2">
      <div className="flex justify-center">#</div>
      <div>{/* Space for Image */}</div>
      <div>Title</div>
      <div className="flex justify-end">
        <Clock3 size={16} />
      </div>
    </div>
  );
}

export default SongHeader;
