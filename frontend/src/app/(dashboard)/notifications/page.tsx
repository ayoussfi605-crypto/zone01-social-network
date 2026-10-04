"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Check, Users, X } from "lucide-react";
import { groupService } from "@/src/services/groupService";
import { profileService } from "@/src/services/profileService";
import type { GroupInvite } from "@/src/types/group";
import type { FollowerSummary } from "@/src/types/profile";

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? "?"}${lastName[0] ?? ""}`.toUpperCase();
}

export default function NotificationsPage() {
  const [followRequests, setFollowRequests] = useState<FollowerSummary[]>([]);
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");

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

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/chat"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            >
              <ArrowLeft size={16} /> Back to chat
            </Link>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Bell size={21} />
              </span>
              <div>
                <h1 className="text-2xl font-bold">Notifications</h1>
                <p className="text-sm text-zinc-500">
                  {notificationCount} pending{" "}
                  {notificationCount === 1 ? "request" : "requests"}
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/profile"
            className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
          >
            Your profile
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <section className="mb-6 rounded-2xl border border-zinc-200 bg-white px-5 sm:px-7">
          <div className="flex items-center justify-between border-b border-zinc-100 py-5">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              <h2 className="font-bold">Follow requests</h2>
            </div>
            <span className="text-sm text-zinc-500">
              {followRequests.length}
            </span>
          </div>
          {loading ? (
            <p className="py-8 text-sm text-zinc-500">Loading requests…</p>
          ) : followRequests.length === 0 ? (
            <p className="py-8 text-sm text-zinc-500">
              No pending follow requests.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {followRequests.map((request) => {
                const actionID = `follow-${request.id}`;
                return (
                  <li
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <Link
                      href={`/profile/${request.id}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                        {request.avatar_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profileService.avatarURL(request.avatar_path)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(request.first_name, request.last_name)
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {request.first_name} {request.last_name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          wants to follow you
                        </span>
                      </span>
                    </Link>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyAction === actionID}
                        onClick={() =>
                          void respondToFollowRequest(request.id, true)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                      >
                        <Check size={15} /> Accept
                      </button>
                      <button
                        type="button"
                        disabled={busyAction === actionID}
                        onClick={() =>
                          void respondToFollowRequest(request.id, false)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                      >
                        <X size={15} /> Decline
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white px-5 sm:px-7">
          <div className="flex items-center justify-between border-b border-zinc-100 py-5">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              <h2 className="font-bold">Group invitations</h2>
            </div>
            <span className="text-sm text-zinc-500">{groupInvites.length}</span>
          </div>
          {loading ? (
            <p className="py-8 text-sm text-zinc-500">Loading invitations…</p>
          ) : groupInvites.length === 0 ? (
            <p className="py-8 text-sm text-zinc-500">
              No pending group invitations.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {groupInvites.map((invite) => {
                const actionID = `group-${invite.group_id}`;
                const creator =
                  `${invite.creator_first_name} ${invite.creator_last_name}`.trim();
                return (
                  <li
                    key={invite.group_id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <Users size={19} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {invite.title}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          {creator
                            ? `Invited by ${creator}`
                            : "You were invited to join this group"}
                        </span>
                        {invite.description && (
                          <span className="mt-1 block truncate text-xs text-zinc-400">
                            {invite.description}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyAction === actionID}
                        onClick={() =>
                          void respondToGroupInvite(invite.group_id, true)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                      >
                        <Check size={15} /> Accept
                      </button>
                      <button
                        type="button"
                        disabled={busyAction === actionID}
                        onClick={() =>
                          void respondToGroupInvite(invite.group_id, false)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                      >
                        <X size={15} /> Decline
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
