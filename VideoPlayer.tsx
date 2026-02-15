import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const hlsRef = useRef<Hls | null>(null);
  const resumeAtRef = useRef<number | null>(null);
  const lastSavedSecondRef = useRef<number>(-1);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

  const navigate = useNavigate();

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const remainingSeconds = Math.max(0, Math.ceil((duration || 0) - progress));
  const showNextPrompt = isSeries && hasNextEpisode && duration > 0 && remainingSeconds <= 15;
  const isHlsStream = /\.m3u8($|\?)/i.test(url);

  const destroyHls = useCallback(() => {
    if (!hlsRef.current) return;
    hlsRef.current.destroy();
    hlsRef.current = null;
  }, []);

  const playVideo = useCallback(async (video: HTMLVideoElement) => {
    try {
      await video.play();
      return;
    } catch {
      // Autoplay may fail with audio on mobile. Try muted fallback.
    }

    if (video.muted) return;

    try {
      video.muted = true;
      setMuted(true);
      await video.play();
    } catch {
      // Playback still blocked and will require user interaction.
    }
  }, []);

  const scheduleAutoHide = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    if (!playing) return;
    hideTimeout.current = setTimeout(() => setShowControls(false), 3000);
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    destroyHls();
    setPlayerError(null);
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    setLoading(true);
    setShowControls(true);
    lastSavedSecondRef.current = -1;

    video.pause();
    video.removeAttribute('src');
    video.load();

    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('x5-playsinline', 'true');
    video.preload = 'auto';
    video.playsInline = true;
    video.autoplay = true;

    const saved = Number.parseFloat(localStorage.getItem(`vibecines_progress_${contentId}`) || '');
    resumeAtRef.current = Number.isFinite(saved) && saved > 0 ? saved : null;

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        startFragPrefetch: true,
        backBufferLength: 30,
        maxBufferLength: 25,
      });

      hlsRef.current = hls;
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void playVideo(video);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }

        setPlayerError('Falha ao carregar este video.');
        setLoading(false);
      });

      hls.loadSource(url);

      return () => {
        destroyHls();
      };
    }

    if (isHlsStream && video.canPlayType('application/vnd.apple.mpegurl') === '') {
      setPlayerError('Este navegador nao suporta o formato deste stream.');
      setLoading(false);
      return;
    }

    video.src = url;
    video.load();
    void playVideo(video);

    return () => {
      destroyHls();
    };
  }, [url, contentId, isHlsStream, destroyHls, playVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const currentTime = video.currentTime;
      setProgress(currentTime);

      const currentSecond = Math.floor(currentTime);
      if (currentSecond >= 0 && currentSecond % 5 === 0 && currentSecond !== lastSavedSecondRef.current) {
        lastSavedSecondRef.current = currentSecond;
        localStorage.setItem(`vibecines_progress_${contentId}`, String(currentTime));
      }
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);

      const resumeAt = resumeAtRef.current;
      if (resumeAt && Number.isFinite(video.duration) && resumeAt < Math.max(video.duration - 1, 0)) {
        video.currentTime = resumeAt;
      }

      resumeAtRef.current = null;
    };

    const onCanPlay = () => setLoading(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onError = () => {
      setLoading(false);
      setPlayerError('Nao foi possivel reproduzir este video.');
    };

    const onEndedHandler = () => {
      localStorage.setItem(`vibecines_watched_${contentId}`, '1');
      onEnded?.();
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);
    video.addEventListener('ended', onEndedHandler);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
      video.removeEventListener('ended', onEndedHandler);
    };
  }, [contentId, onEnded]);

  useEffect(() => {
    const fullscreenDoc = document as Document & { webkitFullscreenElement?: Element };
    const video = videoRef.current;
    if (!video) return;

    const onFullscreenChange = () => {
      setFullscreen(Boolean(fullscreenDoc.fullscreenElement || fullscreenDoc.webkitFullscreenElement));
    };

    const onWebkitBegin = () => setFullscreen(true);
    const onWebkitEnd = () => setFullscreen(false);

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
    video.addEventListener('webkitbeginfullscreen', onWebkitBegin as EventListener);
    video.addEventListener('webkitendfullscreen', onWebkitEnd as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
      video.removeEventListener('webkitbeginfullscreen', onWebkitBegin as EventListener);
      video.removeEventListener('webkitendfullscreen', onWebkitEnd as EventListener);
    };
  }, []);

  useEffect(() => {
    scheduleAutoHide();

    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [playing, scheduleAutoHide]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    setPlayerError(null);

    if (video.paused) {
      void playVideo(video);
    } else {
      video.pause();
    }
  };

  const seek = (e: ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Number.parseFloat(e.target.value);
  };

  const skipToNextEpisode = () => {
    localStorage.setItem(`vibecines_watched_${contentId}`, '1');
    onEnded?.();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    const video = videoRef.current as (HTMLVideoElement & {
      webkitDisplayingFullscreen?: boolean;
      webkitEnterFullscreen?: () => void;
      webkitExitFullscreen?: () => void;
      webkitRequestFullscreen?: () => Promise<void> | void;
    }) | null;

    const fullscreenDoc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void> | void;
    };

    if (fullscreenDoc.fullscreenElement || fullscreenDoc.webkitFullscreenElement) {
      if (document.exitFullscreen) void document.exitFullscreen();
      else if (fullscreenDoc.webkitExitFullscreen) void fullscreenDoc.webkitExitFullscreen();
      setFullscreen(false);
      return;
    }

    if (video?.webkitDisplayingFullscreen && video.webkitExitFullscreen) {
      video.webkitExitFullscreen();
      setFullscreen(false);
      return;
    }

    if (containerRef.current.requestFullscreen) {
      void containerRef.current.requestFullscreen();
      setFullscreen(true);
      return;
    }

    if (video?.webkitRequestFullscreen) {
      void video.webkitRequestFullscreen();
      setFullscreen(true);
      return;
    }

    if (video?.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      setFullscreen(true);
    }
  };

  const handleUserActivity = () => {
    setShowControls(true);
    scheduleAutoHide();
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
      className="relative w-full bg-black h-[100svh] md:h-auto md:aspect-video"
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        muted={muted}
        autoPlay
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        onContextMenu={e => e.preventDefault()}
      />

      {loading && !playerError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      )}

      {playerError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-6 text-center pointer-events-none">
          <p className="text-sm text-foreground/90">{playerError}</p>
        </div>
      )}

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

        <div className="flex items-center justify-center">
          <button onClick={togglePlay} className="p-4 rounded-full bg-primary/80 text-primary-foreground backdrop-blur-sm">
            {playing ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 fill-current" />}
          </button>
        </div>

        {showNextPrompt && (
          <div className="absolute right-4 bottom-20 z-20 rounded-lg bg-background/90 border border-border p-3 shadow-card">
            <p className="text-xs text-muted-foreground mb-2">Proximo episodio em ate {remainingSeconds}s</p>
            <button
              onClick={skipToNextEpisode}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              <SkipForward className="w-4 h-4" /> Ir para proximo
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
