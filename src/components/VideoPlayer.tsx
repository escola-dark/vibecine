import { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { ArrowLeft, Loader2, Maximize, Minimize, Pause, Play, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VideoPlayerProps {
  url: string;
  title: string;
  contentId: string;
  onEnded?: () => void;
  isSeries?: boolean;
  hasNextEpisode?: boolean;
}

export function VideoPlayer({ url, title, contentId, onEnded, isSeries = false, hasNextEpisode = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

  const remainingSeconds = Math.max(0, Math.ceil((duration || 0) - progress));
  const showNextPrompt = isSeries && hasNextEpisode && duration > 0 && remainingSeconds <= 15;

  const requestPortraitFullscreen = async () => {
    try {
      if (containerRef.current && !document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setFullscreen(true);
      }
      const orientation = (screen as { orientation?: { lock?: (value: string) => Promise<void> } }).orientation;
      if (orientation?.lock) {
        await orientation.lock('portrait');
      }
    } catch {
      // Ignore browser limitations
    }
  };

  const playVideo = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
      setPlaying(true);
    } catch {
      // autoplay may be blocked by browser policy
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const saved = localStorage.getItem(`vibecines_progress_${contentId}`);
    if (saved) {
      video.currentTime = parseFloat(saved);
    }

    setLoading(true);

    if (url.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void playVideo();
      });
      return () => hls.destroy();
    }

    video.src = url;
    void playVideo();
  }, [url, contentId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setProgress(video.currentTime);
      if (Math.floor(video.currentTime) % 5 === 0) {
        localStorage.setItem(`vibecines_progress_${contentId}`, String(video.currentTime));
      }
    };

    const onLoaded = () => setDuration(video.duration || 0);
    const onCanPlay = () => setLoading(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEndedHandler = () => {
      localStorage.setItem(`vibecines_watched_${contentId}`, '1');
      onEnded?.();
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEndedHandler);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEndedHandler);
    };
  }, [contentId, onEnded]);

  const togglePlay = () => {
    if (loading) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void requestPortraitFullscreen();
      void video.play();
    } else {
      video.pause();
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = parseFloat(e.target.value);
  };

  const skipToNextEpisode = () => {
    localStorage.setItem(`vibecines_watched_${contentId}`, '1');
    onEnded?.();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      setFullscreen(false);
    } else {
      void containerRef.current.requestFullscreen();
      setFullscreen(true);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  const formatTime = (t: number) => {
    if (!Number.isFinite(t) || t < 0) return '00:00';
    const total = Math.floor(t);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, Math.max(0, (progress / duration) * 100));
  }, [progress, duration]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black"
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
    >
      <video ref={videoRef} className="w-full h-full" muted={muted} />

      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 bg-gradient-to-b from-background/80 to-transparent">
          <button onClick={() => navigate(-1)} className="p-1 text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-foreground line-clamp-1">{title}</span>
        </div>

        {!loading && (
          <div className="flex items-center justify-center">
            <button onClick={togglePlay} className="p-4 rounded-full bg-primary/80 text-primary-foreground backdrop-blur-sm">
              {playing ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 fill-current" />}
            </button>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="flex items-center gap-2 rounded-lg bg-background/70 px-3 py-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          </div>
        )}

        {showNextPrompt && (
          <div className="absolute right-4 bottom-20 z-20 rounded-lg bg-background/90 border border-border p-3 shadow-card">
            <p className="text-xs text-muted-foreground mb-2">Próximo episódio em até {remainingSeconds}s</p>
            <button
              onClick={skipToNextEpisode}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              <SkipForward className="w-4 h-4" /> Ir para próximo
            </button>
          </div>
        )}

        <div className="p-4 bg-gradient-to-t from-background/80 to-transparent space-y-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            onChange={seek}
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${progressPercent}%, hsl(var(--muted)) ${progressPercent}%, hsl(var(--muted)) 100%)`,
            }}
            className="w-full h-1 appearance-none rounded-full cursor-pointer"
          />
          <div className="flex items-center justify-between text-xs text-foreground/70">
            <span>{formatTime(progress)} / {formatTime(duration)}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setMuted(!muted)} className="hover:text-primary transition-colors">
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button onClick={toggleFullscreen} className="hover:text-primary transition-colors">
                {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
