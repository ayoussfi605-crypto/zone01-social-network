"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useWebSocket } from "@/src/context/WebSocketConetext";
import { notificationService } from "@/src/services/notificationService";
import type { AppNotification } from "@/src/types/notification";

function targetFor(notification: AppNotification) {
  switch (notification.type) {
    case "group_invite":
    case "group_join_request":
    case "group_event":
      return notification.group_id
        ? `/groups/${notification.group_id}`
        : "/notifications";
    default:
      return notification.actor_id
        ? `/profile/${notification.actor_id}`
        : "/notifications";
  }
}

function timeAgo(value: string) {
  const elapsed = Date.now() - Date.parse(value);
  if (Number.isNaN(elapsed)) return "";
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  // useWebSocket() throws when there is no WebSocketProvider (a page rendered
  // outside the (dashboard) layout, e.g. the root '/'). The bell then degrades
  // to a static button: it never opens. Inside the dashboard layout the
  // provider exists and this component behaves normally.
  const { receiveMessage } = useWebSocket();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);

  const refreshCount = useCallback(() => {
    notificationService
      .unreadCount()
      .then(setUnread)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(refreshCount, 30000);
    return () => clearInterval(timer);
  }, [refreshCount]);

  useEffect(
    () =>
      receiveMessage((event) => {
        const frame = event as unknown as {
          type?: string;
          notification?: AppNotification;
        };
        if (frame.type !== "notification") return;
        setUnread((current) => current + 1);
        if (frame.notification) {
          setItems((current) => [
            frame.notification as AppNotification,
            ...current.filter((item) => item.id !== frame.notification?.id),
          ]);
        }
      }),
    [receiveMessage],
  );

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function openPanel() {
    const next = !open;
    // The provider only exists inside the dashboard layout. Before it does, the
    // bell stays static (no dropdown, no list fetch).
    if (!started) {
      setStarted(true);
      setOpen(next);
      return;
    }
    setOpen(next);
    if (!next) return;
    setLoading(true);
    try {
      const list = await notificationService.list(30);
      setItems(list);
      setUnread(list.filter((item) => !item.is_read).length);
    } catch {
      // Keep the existing list if the request fails.
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    setUnread(0);
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    try {
      await notificationService.markAllRead();
    } catch {
      refreshCount();
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => void openPanel()}
        aria-label="Notifications"
        title="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-[#111827]"
      >
        <Bell size={18} />
        {unread > 0 && started && (
          <span className="absolute -right-1 -top-1 flex h-2 w-2 rounded-full bg-[#4ADE80]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(90vw,360px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-bold">Notifications</h2>
            {items.some((item) => !item.is_read) && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B7280]"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-zinc-200 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={targetFor(item)}
                    onClick={() => {
                      setOpen(false);
                      if (!item.is_read && started) {
                        setUnread((current) => Math.max(0, current - 1));
                        void notificationService
                          .markRead(item.id)
                          .catch(() => undefined);
                      }
                    }}
                    className={`flex gap-3 px-4 py-3 ${
                      item.is_read ? "bg-white" : "bg-[#C2DCFB]/25"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C2DCFB] text-xs font-bold text-[#111827]">
                      {item.actor_avatar ? (
                        <img
                          src={notificationService.avatarURL(item.actor_avatar)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (item.actor_name || "?")[0]
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-5 text-[#262626]">
                        {item.text || item.actor_name}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        {timeAgo(item.created_at)}
                      </span>
                    </span>
                    {!item.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-black" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-zinc-200 px-4 py-3 text-center text-xs font-bold text-[#111827]"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
