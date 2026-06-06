/**
 * Relative time for chat previews: "2m ago", "1h ago", "Today", "Yesterday", or date string.
 */

/**
 * Format a timestamp as relative time for the latest message preview.
 * - Under 1 min: "Just now" or "&lt;1m ago"
 * - Under 1 hour: "Xm ago"
 * - Under 24 hours: "Xh ago"
 * - Today (same calendar day): "Today"
 * - Yesterday: "Yesterday"
 * - Older: short date e.g. "Mon, Jan 26" or "1/26"
 */
export function formatRelativeTime(timestamp: Date | number | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp as string | number);
  if (!date || !Number.isFinite(date.getTime())) return '';
  const now = new Date();
  const ms = now.getTime() - date.getTime();
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (sec < 60) return 'Just now';
  if (min < 60) return `${min}m ago`;
  if (hour < 24) return `${hour}h ago`;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
