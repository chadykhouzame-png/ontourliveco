import { useEffect, useState } from 'react';
import { useLaunchDate } from '@/hooks/useLaunchDate';

/**
 * Editorial countdown for the First Light holding page.
 * Reads target from site_settings.launch_date so admins can adjust it live.
 */
export default function LaunchCountdown() {
  const { loading, iso } = useLaunchDate();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (loading || !iso) return null;

  const target = new Date(iso).getTime();
  const diff = Math.max(0, target - now);
  const isLive = diff === 0;

  const seconds = Math.floor(diff / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number, len = 2) => String(n).padStart(len, '0');

  return (
    <div className="fl-countdown" aria-live="polite" aria-label="Time until launch">
      {isLive ? (
        <p className="fl-live">The stage is lit. We&rsquo;re live.</p>
      ) : (
        <>
          <div className="fl-cd-grid" role="timer">
            <Unit value={pad(days, days > 999 ? 4 : 3)} label="Days" />
            <Sep />
            <Unit value={pad(hours)} label="Hrs" />
            <Sep />
            <Unit value={pad(minutes)} label="Min" />
            <Sep />
            <Unit value={pad(secs)} label="Sec" />
          </div>
          <p className="fl-cd-cap">Until first light</p>
        </>
      )}
    </div>
  );
}

const Unit = ({ value, label }: { value: string; label: string }) => (
  <div className="fl-cd-unit">
    <span className="fl-cd-num">{value}</span>
    <span className="fl-cd-label">{label}</span>
  </div>
);

const Sep = () => (
  <span className="fl-cd-sep" aria-hidden="true">
    :
  </span>
);
