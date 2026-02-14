import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { ArrowLeft, Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VideoPlayerProps {
  url: string;
  title: string;
  contentId: string;
}

export function VideoPlayer({ url, title, contentId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const saved = localStorage.getItem(`vibecines_progress_${contentId}`);
    if (saved) {
      video.currentTime = parseFloat(saved);
    }

    if (url.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      return () => hls.destroy();
    }

    video.src = url;
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
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [contentId]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleUserInteraction = () => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setShowControls(false), 2500);
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    handleUserInteraction();

    if (video.paused) {
      await video.play();
    } else {
      video.pause();
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = parseFloat(e.target.value);
    handleUserInteraction();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void containerRef.current.requestFullscreen();
  };

  const formatTime = (t: number) => {
    if (!Number.isFinite(t) || t <= 0) return '00:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black overflow-hidden min-h-[260px] aspect-[4/3] sm:aspect-video"
      onMouseMove={handleUserInteraction}
      onTouchStart={handleUserInteraction}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        muted={muted}
        playsInline
        autoPlay
      />

      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-b from-background/90 via-background/45 to-transparent">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 text-foreground hover:text-primary transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm sm:text-base font-medium text-foreground truncate">{title}</span>
        </div>

        <div className="flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="p-3 sm:p-4 rounded-full bg-primary/85 text-primary-foreground backdrop-blur-sm shadow-lg"
            aria-label={playing ? 'Pausar' : 'Reproduzir'}
          >
            {playing ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 fill-current" />}
          </button>
        </div>

        <div className="p-3 sm:p-4 bg-gradient-to-t from-background/90 via-background/55 to-transparent space-y-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            onChange={seek}
            className="w-full h-1.5 appearance-none bg-muted/80 rounded-full cursor-pointer accent-primary"
          />

          <div className="flex items-center justify-between text-xs sm:text-sm text-foreground/80">
            <span>
              {formatTime(progress)} / {formatTime(duration)}
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setMuted(!muted);
                  handleUserInteraction();
                }}
                className="hover:text-primary transition-colors"
                aria-label={muted ? 'Ativar som' : 'Silenciar'}
              >
                {muted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <button onClick={toggleFullscreen} className="hover:text-primary transition-colors" aria-label="Tela cheia">
                {fullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
