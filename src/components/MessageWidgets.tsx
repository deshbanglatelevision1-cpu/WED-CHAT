import React from 'react';
import { MapPin, FileText, Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export function LocationWidget({ lat, lng }: { lat: number, lng: number }) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return (
    <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="block bg-black/20 rounded-xl overflow-hidden hover:opacity-90 transition">
      <div className="bg-green-600/20 p-4 flex items-center justify-center h-24">
        <MapPin size={32} className="text-green-500" />
      </div>
      <div className="p-3 bg-black/40">
        <div className="text-sm font-semibold text-white">Live Location shared</div>
        <div className="text-xs text-gray-400 mt-1 truncate">{lat}, {lng}</div>
      </div>
    </a>
  );
}

export function DocumentWidget({ url, name }: { url: string, name: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-black/20 p-3 rounded-xl hover:bg-black/40 transition group">
      <div className="bg-indigo-500/20 p-2 rounded-lg">
        <FileText size={24} className="text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate max-w-[150px]">{name}</div>
        <div className="text-xs text-gray-400 uppercase">Document</div>
      </div>
      <Download size={16} className="text-gray-400 group-hover:text-white transition" />
    </a>
  );
}

export function EventWidget({ title, date, time }: { title: string, date: string, time: string }) {
  return (
    <div className="bg-black/20 p-4 rounded-xl min-w-[200px]">
      <div className="flex items-center gap-2 mb-2 text-purple-400">
        <Calendar size={18} />
        <span className="text-xs font-bold uppercase tracking-wider">Upcoming Event</span>
      </div>
      <h4 className="text-lg font-bold text-white leading-tight mb-2">{title}</h4>
      <div className="bg-black/40 rounded-lg p-2 text-sm text-gray-300 font-mono">
        {date} at {time}
      </div>
    </div>
  );
}

export function AudioWidget({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className="bg-black/40 p-3 rounded-2xl min-w-[220px] flex items-center gap-3 backdrop-blur-md border border-white/5 shadow-inner">
      <audio 
        ref={audioRef} 
        src={url} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={handleEnded}
        hidden 
      />
      <button 
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-premium-blue flex items-center justify-center flex-shrink-0 hover:bg-blue-600 transition-all shadow-md active:scale-95"
      >
        {isPlaying ? (
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-white rounded-full animate-pulse" />
            <div className="w-1 h-3 bg-white rounded-full animate-pulse" />
          </div>
        ) : (
          <div className="ml-1 w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent" />
        )}
      </button>
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-1 h-6">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className={clsx(
                "w-1 rounded-full transition-all duration-300",
                isPlaying ? "audio-wave" : "",
                i / 20 * 100 < progress ? "bg-premium-blue" : "bg-white/20"
              )} 
              style={{ 
                height: `${20 + Math.sin(i * 0.5) * 40 + 40}%`,
                animationDelay: `${i * 0.05}s`
              }} 
            />
          ))}
        </div>
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-premium-blue transition-all duration-100" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>
    </div>
  );
}
