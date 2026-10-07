/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCheck, Users } from "lucide-react";
import { groupService } from "@/src/services/groupService";
import { notificationService } from "@/src/services/notificationService";
import { profileService } from "@/src/services/profileService";
import type { AppNotification } from "@/src/types/notification";
import type {
  GroupEvent,
  GroupInvite,
  GroupJoinRequest,
} from "@/src/types/group";
import type { FollowerSummary } from "@/src/types/profile";
import { useWebSocket } from "@/src/context/WebSocketConetext";

type NotificationFilter = "All" | "Unread";
type GroupRequestNotification = {
  groupID: number;
  groupTitle: string;
  request: GroupJoinRequest;
};
type GroupEventNotification = { groupTitle: string; event: GroupEvent };

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? "?"}${lastName[0] ?? ""}`.toUpperCase();
}

function notificationHref(item: AppNotification) {
  if (item.type === "group_invite" || item.type === "group_join_request") {
    return item.group_id ? `/groups/${item.group_id}` : "/notifications";
  }
  if (item.type === "group_event") {
    return item.group_id ? `/groups/${item.group_id}` : "/notifications";
  }
  return item.actor_id ? `/profile/${item.actor_id}` : "/notifications";
}

function notificationTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function NotificationsPage() {
  const [followRequests, setFollowRequests] = useState<FollowerSummary[]>([]);
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [groupJoinRequests, setGroupJoinRequests] = useState<
    GroupRequestNotification[]
  >([]);
  const [groupEventNotifications, setGroupEventNotifications] = useState<
    GroupEventNotification[]
  >([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [filter, setFilter] = useState<NotificationFilter>("All");

  const ws = useWebSocket();
  const LoadAllNotification = () => {
    let active = true;
    Promise.all([
      profileService.getPendingRequests(),
      groupService.getPendingInvites(),
      groupService.browseGroups(),
      notificationService.list(50),
    ])
      .then(async ([requests, invites, groups, persisted]) => {
        if (!active) return;
        const ownedGroups = groups.filter((group) => group.is_creator);
        const memberGroups = groups.filter(
          (group) => group.membership_status === "member",
        );
        const [joinRequestLists, eventLists] = await Promise.all([
          Promise.all(
            ownedGroups.map((group) => groupService.getJoinRequests(group.id)),
          ),
          Promise.all(
            memberGroups.map((group) => groupService.getEvents(group.id)),
          ),
        ]);
        if (!active) return;
        setFollowRequests(requests);
        setGroupInvites(invites);
        setNotifications(persisted);
        setGroupJoinRequests(
          ownedGroups.flatMap((group, index) =>
            joinRequestLists[index].map((request) => ({
              groupID: group.id,
              groupTitle: group.title,
              request,
            })),
          ),
        );
        setGroupEventNotifications(
          memberGroups
            .flatMap((group, index) =>
              eventLists[index].map((event) => ({
                groupTitle: group.title,
                event,
              })),
            )
            .sort(
              (first, second) =>
                Date.parse(second.event.created_at) -
                Date.parse(first.event.created_at),
            )
            .slice(0, 8),
        );
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
  };

  useEffect(() => {
    LoadAllNotification();
  }, [ws]);

  useEffect(() => {
    return ws.receiveMessage(async (e) => {
      if (e.type == "notification") {
        LoadAllNotification();
      }
    });
  }, [ws]);

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

  async function respondToGroupJoinRequest(
    groupID: number,
    userID: number,
    accept: boolean,
  ) {
    const actionID = `join-${groupID}-${userID}`;
    setBusyAction(actionID);
    setError("");
    try {
      await groupService.respondToJoinRequest(groupID, userID, accept);
      setGroupJoinRequests((current) =>
        current.filter(
          (item) => item.groupID !== groupID || item.request.user_id !== userID,
        ),
      );
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not respond to group request",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function markAllRead() {
    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true })),
    );
    try {
      await notificationService.markAllRead();
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not update notifications",
      );
    }
  }

  const notificationCount =
    followRequests.length +
    groupInvites.length +
    groupJoinRequests.length +
    groupEventNotifications.length;
  const visibleNotifications =
    filter === "Unread"
      ? notifications.filter((item) => !item.is_read)
      : notifications;
  const hasResponses =
    followRequests.length > 0 ||
    groupInvites.length > 0 ||
    groupJoinRequests.length > 0;

  return (
    <main className="min-h-screen bg-white pb-24 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white session-actions-gap">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-black tracking-[0.18em]">
            Socil Network
          </Link>
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {(["All", "Unread"] as const).map((tab) => (
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
          {hasResponses && (
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
                  {groupJoinRequests.map(({ groupID, groupTitle, request }) => {
                    const actionID = `join-${groupID}-${request.user_id}`;
                    return (
                      <div
                        key={actionID}
                        className="flex flex-wrap items-center gap-3 py-3"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C2DCFB] text-sm font-bold text-[#111827]">
                          {initials(request.first_name, request.last_name)}
                        </span>
                        <span className="min-w-0 flex-1 text-sm">
                          <b>
                            {request.first_name} {request.last_name}
                          </b>{" "}
                          requested to join <b>{groupTitle}</b>
                        </span>
                        <button
                          type="button"
                          disabled={busyAction === actionID}
                          onClick={() =>
                            void respondToGroupJoinRequest(
                              groupID,
                              request.user_id,
                              true,
                            )
                          }
                          className="rounded-full bg-black px-3 py-2 text-xs font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={busyAction === actionID}
                          onClick={() =>
                            void respondToGroupJoinRequest(
                              groupID,
                              request.user_id,
                              false,
                            )
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

          {groupEventNotifications.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">New group events</h2>
                <span className="text-xs text-[#6B7280]">
                  {groupEventNotifications.length}
                </span>
              </div>
              <ul className="divide-y divide-zinc-200">
                {groupEventNotifications.map(({ groupTitle, event }) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {event.title}
                      </span>
                      <span className="block truncate text-xs text-[#6B7280]">
                        {groupTitle} ·{" "}
                        {new Date(event.event_time).toLocaleString()}
                      </span>
                    </span>
                    <Link
                      href={`/groups/${event.group_id}`}
                      className="shrink-0 rounded-full bg-[#C2DCFB] px-3 py-2 text-xs font-bold text-[#111827]"
                    >
                      View event
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Your latest
                </p>
                <h2 className="mt-1 text-lg font-bold">Notifications</h2>
              </div>
              {notifications.some((item) => !item.is_read) && (
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
              <p className="p-6 text-sm text-zinc-500">Loading…</p>
            ) : visibleNotifications.length === 0 ? (
              <p className="p-6 text-sm text-zinc-500">
                {filter === "Unread"
                  ? "You have no unread notifications."
                  : "No notifications yet."}
              </p>
            ) : (
              <ul className="divide-y divide-zinc-200">
                {visibleNotifications.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={notificationHref(item)}
                      onClick={() => {
                        if (item.is_read) return;
                        setNotifications((current) =>
                          current.map((entry) =>
                            entry.id === item.id
                              ? { ...entry, is_read: true }
                              : entry,
                          ),
                        );
                        void notificationService
                          .markRead(item.id)
                          .catch(() => undefined);
                      }}
                      className={`flex gap-3 px-4 py-4 sm:px-5 ${item.is_read ? "bg-white" : "bg-[#C2DCFB]/25"}`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C2DCFB] text-sm font-bold text-[#111827]">
                        {item.actor_avatar ? (
                          <img
                            src={notificationService.avatarURL(
                              item.actor_avatar,
                            )}
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
                        <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                          {notificationTime(item.created_at)}
                        </span>
                      </span>
                      {!item.is_read && (
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-black" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
