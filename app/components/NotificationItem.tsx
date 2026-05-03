"use client";

import type { NotificationRecord } from "@/app/lib/notifications";

type Props = {
  item: NotificationRecord;
  onClick?: () => void;
};

function TypeIcon({ type }: { type: NotificationRecord["type"] }) {
  if (type === "Achievement") {
    return (
      <span className="gh-feed-item-icon gh-feed-item-icon--rank" aria-hidden="true" title="Rank Up">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M10 3v14M4 9l6-6 6 6" />
        </svg>
      </span>
    );
  }
  if (type === "JobAlert") {
    return (
      <span className="gh-feed-item-icon gh-feed-item-icon--impact" aria-hidden="true" title="Impact Verified">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <polyline points="4 10 8 14 16 6" />
        </svg>
      </span>
    );
  }
  // Reminder → Coach Tip
  return (
    <span className="gh-feed-item-icon gh-feed-item-icon--tip" aria-hidden="true" title="Coach Tip">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M10 2a5 5 0 0 1 3.54 8.54c-.4.4-.54.9-.54 1.46v1h-6v-1c0-.56-.14-1.06-.54-1.46A5 5 0 0 1 10 2z" />
        <path d="M8 16h4M9 18h2" />
      </svg>
    </span>
  );
}

export default function NotificationItem({ item, onClick }: Props) {
  const timeAgo = (() => {
    const diff = Date.now() - item.createdAt;
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <button
      type="button"
      className={`gh-feed-item${item.read ? " gh-feed-item--read" : " gh-feed-item--unread"}`}
      onClick={onClick}
    >
      <TypeIcon type={item.type} />
      <span className="gh-feed-item-body">
        <span className="gh-feed-item-title">{item.title}</span>
        <span className="gh-feed-item-msg">{item.message}</span>
        {item.ctaLabel && <span className="gh-feed-item-cta">{item.ctaLabel} →</span>}
        <span className="gh-feed-item-time">{timeAgo}</span>
      </span>
      {!item.read && <span className="gh-feed-item-dot" aria-label="Unread" />}
    </button>
  );
}
