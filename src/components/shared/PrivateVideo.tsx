import { useEffect, useRef, useState } from 'react';
import { privateFileUrl } from '@/lib/storage';
import { Button } from '@/components/ui/button';

interface Props { bucket: string; path: string; className?: string; autoPlay?: boolean }
const MAX_RECOVERIES = 2;

function PrivateVideoContent({ bucket, path, className, autoPlay = false }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const resume = useRef({ time: 0, playing: autoPlay });
  const recoveries = useRef(0);
  const refreshing = useRef(false);
  const renewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  const renew = () => {
    if (refreshing.current) return;
    refreshing.current = true;
    const player = video.current;
    if (player) resume.current = { time: player.currentTime, playing: !player.paused };
    setRevision(r => r + 1);
  };
  useEffect(() => {
    let active = true;
    privateFileUrl(bucket, path).then(next => {
      if (!active) return;
      if (video.current?.getAttribute("src") === next) video.current.load();
      setUrl(next);
      setError(false);
      refreshing.current = false;
      // Renew before the storage URL's five-minute TTL. Keep the same video
      // element so position/play intent survive a source replacement.
      renewTimer.current = setTimeout(renew, 240_000);
    }).catch(() => { if (active) { refreshing.current = false; setError(true); } });
    return () => { active = false; clearTimeout(renewTimer.current); };
  }, [bucket, path, revision]);

  return <div>
    {url && <video ref={video} src={url} autoPlay={autoPlay} controls className={className}
      onLoadedMetadata={() => {
        const player = video.current;
        if (!player) return;
        if (resume.current.time > 0) player.currentTime = Number.isFinite(player.duration)
          ? Math.min(resume.current.time, player.duration) : resume.current.time;
        if (resume.current.playing) void player.play().catch(() => { /* User can press play if autoplay is blocked. */ });
      }}
      onError={() => {
        if (refreshing.current || error) return;
        if (recoveries.current >= MAX_RECOVERIES) { clearTimeout(renewTimer.current); setError(true); return; }
        recoveries.current++;
        renew();
      }} />}
    {error ? <div role="alert">Could not play this video. Check your access and connection.
      <Button variant="outline" onClick={() => { recoveries.current = 0; setError(false); renew(); }}>Retry video</Button>
    </div> : !url ? <p role="status">Loading video…</p> : null}
  </div>;
}

export default function PrivateVideo(props: Props) {
  return <PrivateVideoContent key={`${props.bucket}:${props.path}`} {...props} />;
}
