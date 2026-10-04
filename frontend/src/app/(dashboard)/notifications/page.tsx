/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AtSign, Bell, Heart, MessageCircle, Users } from "lucide-react";
import MobileBottomNav from "@/src/components/navigation/MobileBottomNav";
import { groupService } from "@/src/services/groupService";
import { profileService } from "@/src/services/profileService";
import type { GroupInvite } from "@/src/types/group";
import type { FollowerSummary } from "@/src/types/profile";

type NotificationFilter = "All" | "Mentions" | "Verified";

const activityNotifications = [
  {
    id: "follow-activity",
    kind: "follow",
    actor: "Elena Moss and 12 others",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=85",
    text: "followed you",
    time: "20 MINUTES AGO",
    verified: false,
  },
  {
    id: "like-activity",
    kind: "like",
    actor: "Sophia Chen",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=85",
    text: "liked your vibe",
    time: "2 HOURS AGO",
    verified: true,
    snippet: "Chasing shadows in the concrete jungle...",
  },
  {
    id: "comment-activity",
    kind: "comment",
    actor: "Marcus Rivers",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=85",
    text: "commented on your vibe",
    time: "5 HOURS AGO",
    verified: true,
    snippet: "This lighting is absolutely perfect! What camera did you use?",
  },
  {
    id: "mention-activity",
    kind: "mention",
    actor: "Zoe Vent",
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=85",
    text: "mentioned you in a vibe",
    time: "YESTERDAY",
    verified: false,
  },
];

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? "?"}${lastName[0] ?? ""}`.toUpperCase();
}

export default function NotificationsPage() {
  const [followRequests, setFollowRequests] = useState<FollowerSummary[]>([]);
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [filter, setFilter] = useState<NotificationFilter>("All");

  useEffect(() => {
    let active = true;
    Promise.all([
      profileService.getPendingRequests(),
      groupService.getPendingInvites(),
    ])
      .then(([requests, invites]) => {
        if (!active) return;
        if (!Array.isArray(requests) || !Array.isArray(invites)) {
          throw new Error("Invalid notifications response");
        }
        setFollowRequests(requests);
        setGroupInvites(invites);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load notifications",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function respondToFollowRequest(followerID: number, accept: boolean) {
    const actionID = `follow-${followerID}`;
    setBusyAction(actionID);
    setError("");
    try {
      await profileService.respondToFollowRequest(followerID, accept);
      setFollowRequests((current) =>
        current.filter((request) => request.id !== followerID),
      );
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not update follow request",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function respondToGroupInvite(groupID: number, accept: boolean) {
    const actionID = `group-${groupID}`;
    setBusyAction(actionID);
    setError("");
    try {
      await groupService.respondToInvite(groupID, accept);
      setGroupInvites((current) =>
        current.filter((invite) => invite.group_id !== groupID),
      );
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not update group invitation",
      );
    } finally {
      setBusyAction("");
    }
  }

  const notificationCount = followRequests.length + groupInvites.length;
  const visibleActivities = useMemo(() => {
    if (filter === "Mentions")
      return activityNotifications.filter((item) => item.kind === "mention");
    if (filter === "Verified")
      return activityNotifications.filter((item) => item.verified);
    return activityNotifications;
  }, [filter]);

  return (
    <main className="min-h-screen bg-zinc-100 pb-24 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-black tracking-[0.18em]">
            VIBE
          </Link>
          <h1 className="text-sm font-bold">Notifications</h1>
          <Bell size={19} />
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {(["All", "Mentions", "Verified"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${filter === tab ? "bg-black text-white" : "bg-[#E5E7EB] text-[#262626]"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-6xl rounded-xl bg-[#F3F4F6] p-3 text-sm text-[#262626]"
        >
          {error}
        </p>
      )}

      <div className="mx-auto grid max-w-6xl gap-5 px-3 py-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-5">
        <div className="space-y-5">
          {(followRequests.length > 0 || groupInvites.length > 0) && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">Needs your response</h2>
                <span className="rounded-full bg-[#E5E7EB] px-2.5 py-1 text-xs font-bold text-[#262626]">
                  {notificationCount}
                </span>
              </div>
              {loading ? (
                <p className="py-4 text-sm text-zinc-500">Loading requests…</p>
              ) : (
                <div className="divide-y divide-zinc-200">
                  {followRequests.map((request) => {
                    const actionID = `follow-${request.id}`;
                    return (
                      <div
                        key={actionID}
                        className="flex flex-wrap items-center gap-3 py-3"
                      >
                        <Link
                          href={`/profile/${request.id}`}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C2DCFB] text-sm font-bold">
                            {request.avatar_path ? (
                              <img
                                src={profileService.avatarURL(
                                  request.avatar_path,
                                )}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials(request.first_name, request.last_name)
                            )}
                          </span>
                          <span className="truncate text-sm">
                            <b>
                              {request.first_name} {request.last_name}
                            </b>{" "}
                            wants to follow you
                          </span>
                        </Link>
                        <button
                          type="button"
                          disabled={busyAction === actionID}
                          onClick={() =>
                            void respondToFollowRequest(request.id, true)
                          }
                          className="rounded-full bg-black px-3 py-2 text-xs font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={busyAction === actionID}
                          onClick={() =>
                            void respondToFollowRequest(request.id, false)
                          }
                          className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-bold text-[#262626]"
                        >
                          Decline
                        </button>
                      </div>
                    );
                  })}
                  {groupInvites.map((invite) => {
                    const actionID = `group-${invite.group_id}`;
                    const creator =
                      `${invite.creator_first_name} ${invite.creator_last_name}`.trim();
                    return (
                      <div
                        key={actionID}
                        className="flex flex-wrap items-center gap-3 py-3"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C2DCFB] text-[#111827]">
                          <Users size={18} />
                        </span>
                        <span className="min-w-0 flex-1 text-sm">
                          <b>{invite.title}</b>
                          <span className="block text-xs text-zinc-500">
                            {creator
                              ? `Invited by ${creator}`
                              : "Group invitation"}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={busyAction === actionID}
                          onClick={() =>
                            void respondToGroupInvite(invite.group_id, true)
                          }
                          className="rounded-full bg-black px-3 py-2 text-xs font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={busyAction === actionID}
                          onClick={() =>
                            void respondToGroupInvite(invite.group_id, false)
                          }
                          className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-bold text-[#262626]"
                        >
                          Decline
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-4 py-4 sm:px-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                Your latest
              </p>
              <h2 className="mt-1 text-lg font-bold">Activity</h2>
            </div>
            <ul className="divide-y divide-zinc-200 px-4 sm:px-5">
              {visibleActivities.map((item) => {
                const Icon =
                  item.kind === "like"
                    ? Heart
                    : item.kind === "comment"
                      ? MessageCircle
                      : item.kind === "mention"
                        ? AtSign
                        : Users;
                return (
                  <li key={item.id} className="flex gap-3 py-4">
                    <span className="relative h-11 w-11 shrink-0">
                      <img
                        src={item.avatar}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#C2DCFB] text-[#111827]">
                        <Icon size={12} />
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-5 text-[#262626]">
                        <b className="text-[#111827]">{item.actor}</b>{" "}
                        {item.text}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold tracking-wide text-[#6B7280]">
                        {item.time}
                      </p>
                      {item.snippet && (
                        <p
                          className={`mt-2 rounded-xl px-3 py-2 text-xs leading-5 text-[#262626] ${item.kind === "like" ? "bg-[#F3F4F6]" : "bg-[#E5E7EB]"}`}
                        >
                          “{item.snippet}”
                        </p>
                      )}
                    </div>
                    {item.verified && (
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#4ADE80]"
                        aria-label="Verified creator"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            {visibleActivities.length === 0 && (
              <p className="p-6 text-sm text-zinc-500">
                Nothing in this category yet.
              </p>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            Around the community
          </p>
          <h2 className="mt-1 text-lg font-bold">Trending Vibes</h2>
          <ul className="mt-4 space-y-3">
            {[
              { tag: "#Minimalism", category: "DESIGN", color: "bg-[#F3F4F6]" },
              { tag: "#VibeWeb", category: "TECH", color: "bg-[#C2DCFB]" },
              { tag: "#DigitalZen", category: "LIFE", color: "bg-[#E5E7EB]" },
            ].map((trend) => (
              <li
                key={trend.tag}
                className={`flex items-center justify-between rounded-xl px-3 py-3 ${trend.color}`}
              >
                <span className="text-sm font-bold text-[#111827]">
                  {trend.tag}
                </span>
                <span className="text-[9px] font-bold tracking-widest text-[#262626]">
                  {trend.category}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/followers"
            className="mt-5 inline-block text-xs font-semibold text-[#262626] underline underline-offset-4"
          >
            Find your people
          </Link>
        </aside>
      </div>
      <MobileBottomNav active="notifications" />
    </main>
  );
}
