export const formatNumber = (n: number): string => n.toLocaleString('id-ID');

export const formatIDR = (n: number): string => `Rp${formatNumber(n)}`;

export const formatTime = (hour: number, minute: number): string => {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${hh}:${mm}`;
};

const DAY_MS = 864e5;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * "Hari ini · 08:45" / "Kemarin · 18:12" / "3 Sep · 09:00"
 */
export function formatRecordingTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const today = startOfDay(now).getTime();
  const that = startOfDay(d).getTime();
  const diffDays = Math.round((today - that) / DAY_MS);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const label =
    diffDays === 0
      ? 'Hari ini'
      : diffDays === 1
        ? 'Kemarin'
        : d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
          });
  return `${label} · ${hh}:${mm}`;
}

/**
 * "baru saja" / "2 menit lalu" / "3 jam lalu" / "5 hari lalu"
 */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(then).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format date string to "15 Sep 2026"
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format seconds to "1j 23m" or "45d" etc
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}d`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j ${m % 60}m`;
  return `${Math.floor(h / 24)}d`;
}
