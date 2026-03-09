export function CardImage({src, songName}: {src: string, songName: string}) {
  return (
    <div className="w-35 h-30 group cursor-pointer">
      <div className="relative overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300">
        <img 
          src={src} 
          alt={songName}
          className="rounded-lg w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-white font-medium text-sm line-clamp-2 drop-shadow-lg">
            {songName}
          </p>
        </div>
      </div>
    </div>
  )
}