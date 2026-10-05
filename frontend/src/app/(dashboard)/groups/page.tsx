/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Building2,
  Check,
  Compass,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { groupService } from "@/src/services/groupService";
import { profileService } from "@/src/services/profileService";
import type { GroupDiscovery, GroupMembershipStatus } from "@/src/types/group";
import type { FollowerSummary } from "@/src/types/profile";

const statusLabels: Record<GroupMembershipStatus, string> = {
  member: "Member",
  pending_invite: "Invited",
  pending_request: "Request pending",
  none: "Not a member",
};

function initials(first: string, last: string) {
  return `${first[0] ?? "?"}${last[0] ?? ""}`.toUpperCase();
}

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupDiscovery[]>([]);
  const [candidates, setCandidates] = useState<FollowerSummary[]>([]);
  const [selectedInvites, setSelectedInvites] = useState<number[]>([]);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [showInvitePicker, setShowInvitePicker] = useState(false);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyGroupID, setBusyGroupID] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([groupService.browseGroups(), profileService.getCurrentUser()])
      .then(async ([available, user]) => {
        const [followers, following] = await Promise.all([
          profileService.getFollowers(user.id).catch(() => []),
          profileService.getFollowing(user.id).catch(() => []),
        ]);
        if (!active) return;
        setGroups(Array.isArray(available) ? available : []);
        const seen = new Set<number>();
        setCandidates(
          [...following, ...followers].filter((person) => {
            if (person.id === user.id || seen.has(person.id)) return false;
            seen.add(person.id);
            return true;
          }),
        );
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Could not load groups",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const myGroups = useMemo(
    () =>
      groups.filter(
        (group) => group.is_creator || group.membership_status === "member",
      ),
    [groups],
  );
  const pendingInvites = useMemo(
    () => groups.filter((group) => group.membership_status === "pending_invite"),
    [groups],
  );

  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groups;
    return groups.filter((group) =>
      `${group.title} ${group.description}`.toLowerCase().includes(normalized),
    );
  }, [groups, query]);

  const visibleCandidates = useMemo(() => {
    const normalized = candidateQuery.trim().toLowerCase();
    if (!normalized) return candidates;
    return candidates.filter((person) =>
      `${person.first_name} ${person.last_name} ${person.nickname}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [candidateQuery, candidates]);

  async function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setCreating(true);
    setError("");
    try {
      const group = await groupService.createGroup(
        title.trim(),
        description.trim(),
        selectedInvites,
      );
      router.push(`/groups/${group.id}`);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Could not create group",
      );
      setCreating(false);
    }
  }

  async function requestToJoin(groupID: number) {
    setBusyGroupID(groupID);
    setError("");
    try {
      await groupService.requestToJoin(groupID);
      setGroups((current) =>
        current.map((group) =>
          group.id === groupID
            ? { ...group, membership_status: "pending_request" }
            : group,
        ),
      );
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not request group access",
      );
    } finally {
      setBusyGroupID(null);
    }
  }

  function statusAction(group: GroupDiscovery) {
    if (group.is_creator || group.membership_status === "member") {
      return (
        <Link
          href={`/groups/${group.id}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-sm font-bold text-white"
        >
          Open group <ArrowRight size={15} />
        </Link>
      );
    }
    if (group.membership_status === "pending_invite") {
      return (
        <Link
          href="/notifications"
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-bold text-[#262626]"
        >
          Respond to invite
        </Link>
      );
    }
    if (group.membership_status === "pending_request") {
      return (
        <button
          type="button"
          disabled
          className="rounded-full bg-[#E5E7EB] px-4 py-2 text-sm font-bold text-[#6B7280]"
        >
          Request pending
        </button>
      );
    }
    return (
      <button
        type="button"
        disabled={busyGroupID === group.id}
        onClick={() => void requestToJoin(group.id)}
        className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
      >
        {busyGroupID === group.id ? "Sending…" : "Request to join"}
      </button>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-24 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="text-lg font-black tracking-[0.18em]">
            VIBE
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-semibold text-[#6B7280] md:flex">
            <Link href="/" className="hover:text-black">
              Home
            </Link>
            <Link href="/chat" className="hover:text-black">
              Messages
            </Link>
            <Link href="/groups" className="text-black">
              Groups
            </Link>
            <Link href="/notifications" className="hover:text-black">
              Notifications
            </Link>
          </nav>
          <Link
            href="/notifications"
            aria-label="Invitations and notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200"
          >
            <Bell size={18} />
            {pendingInvites.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[10px] font-bold text-white">
                {pendingInvites.length}
              </span>
            )}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">
              Community
            </p>
            <h1 className="mt-1 text-3xl font-bold">Groups</h1>
            <p className="mt-2 max-w-xl text-sm text-[#6B7280]">
              Browse communities, request to join, or start one of your own and
              invite the people you want in it.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#262626]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-2">
              <Users size={15} /> {myGroups.length} yours
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-2">
              <Compass size={15} /> {groups.length} total
            </span>
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-[#F3F4F6] p-3 text-sm text-[#262626]"
          >
            {error}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white">
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                <h2 className="font-bold">Your groups</h2>
                <span className="text-xs text-[#6B7280]">
                  {myGroups.length}
                </span>
              </div>
              {loading ? (
                <p className="px-5 py-8 text-center text-sm text-[#6B7280]">
                  Loading your groups…
                </p>
              ) : myGroups.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[#6B7280]">
                  You are not in any group yet. Browse below to request access,
                  or create one.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-200 px-5">
                  {myGroups.map((group) => (
                    <li
                      key={group.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-bold">{group.title}</h3>
                          <span className="rounded-full bg-[#C2DCFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#111827]">
                            {group.is_creator ? "Creator" : "Member"}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-[#6B7280]">
                          {group.description}
                        </p>
                        <p className="mt-1.5 text-xs text-[#6B7280]">
                          {group.member_count}{" "}
                          {group.member_count === 1 ? "member" : "members"}
                        </p>
                      </div>
                      {statusAction(group)}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
                <div className="inline-flex items-center gap-2">
                  <Compass size={17} />
                  <h2 className="font-bold">Browse all groups</h2>
                </div>
                <label className="flex w-full items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2 sm:w-64">
                  <Search size={15} className="text-[#6B7280]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search groups"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#6B7280]"
                  />
                </label>
              </div>

              {loading ? (
                <p className="px-5 py-8 text-center text-sm text-[#6B7280]">
                  Loading groups…
                </p>
              ) : visibleGroups.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Building2 size={24} className="mx-auto text-[#6B7280]" />
                  <p className="mt-3 font-semibold">No groups found</p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Try another search, or create the first group.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-200 px-5">
                  {visibleGroups.map((group) => (
                    <li
                      key={group.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-bold">{group.title}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              group.is_creator ||
                              group.membership_status === "member"
                                ? "bg-[#C2DCFB] text-[#111827]"
                                : group.membership_status === "pending_invite" ||
                                    group.membership_status ===
                                      "pending_request"
                                  ? "bg-[#F3F4F6] text-[#6B7280]"
                                  : "border border-zinc-200 text-[#6B7280]"
                            }`}
                          >
                            {group.is_creator
                              ? "Creator"
                              : statusLabels[group.membership_status]}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-[#6B7280]">
                          {group.description}
                        </p>
                        <p className="mt-1.5 text-xs text-[#6B7280]">
                          {group.member_count}{" "}
                          {group.member_count === 1 ? "member" : "members"}
                        </p>
                      </div>
                      {statusAction(group)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-24">
            <div className="mb-4 flex items-center gap-2">
              <Plus size={18} />
              <h2 className="font-bold">Create a group</h2>
            </div>
            <form onSubmit={(event) => void createGroup(event)} className="space-y-4">
              <label className="block text-sm font-semibold">
                Title
                <input
                  required
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Design Circle"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-black"
                />
              </label>
              <label className="block text-sm font-semibold">
                Description
                <textarea
                  required
                  maxLength={2000}
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What is this group about?"
                  className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-black"
                />
              </label>

              <div className="rounded-xl border border-zinc-200 p-3">
                <button
                  type="button"
                  aria-expanded={showInvitePicker}
                  onClick={() => setShowInvitePicker((current) => !current)}
                  className="flex w-full items-center justify-between text-sm font-semibold"
                >
                  <span className="inline-flex items-center gap-2">
                    <UserPlus size={15} /> Invite people
                  </span>
                  <span className="text-xs font-normal text-[#6B7280]">
                    {selectedInvites.length > 0
                      ? `${selectedInvites.length} selected`
                      : "Optional"}
                  </span>
                </button>

                {showInvitePicker && (
                  <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3">
                    <label className="flex items-center gap-2 rounded-lg bg-[#F3F4F6] px-3 py-2">
                      <Search size={14} className="text-[#6B7280]" />
                      <input
                        value={candidateQuery}
                        onChange={(event) =>
                          setCandidateQuery(event.target.value)
                        }
                        placeholder="Search people"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#6B7280]"
                      />
                    </label>
                    {visibleCandidates.length === 0 ? (
                      <p className="px-1 py-2 text-xs text-[#6B7280]">
                        No people to invite yet. Follow someone first.
                      </p>
                    ) : (
                      <ul className="max-h-44 space-y-1 overflow-y-auto">
                        {visibleCandidates.map((person) => {
                          const selected = selectedInvites.includes(person.id);
                          return (
                            <li key={person.id}>
                              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5 text-sm hover:bg-[#F3F4F6]">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() =>
                                    setSelectedInvites((current) =>
                                      selected
                                        ? current.filter(
                                            (id) => id !== person.id,
                                          )
                                        : [...current, person.id],
                                    )
                                  }
                                  className="accent-black"
                                />
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C2DCFB] text-[10px] font-bold text-[#111827]">
                                  {person.avatar_path ? (
                                    <img
                                      src={profileService.avatarURL(
                                        person.avatar_path,
                                      )}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    initials(
                                      person.first_name,
                                      person.last_name,
                                    )
                                  )}
                                </span>
                                <span className="truncate">
                                  {person.first_name} {person.last_name}
                                </span>
                                {selected && (
                                  <Check
                                    size={14}
                                    className="ml-auto shrink-0 text-[#111827]"
                                  />
                                )}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <p className="text-[11px] text-[#6B7280]">
                      Invited people get an invitation they must accept.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={creating || !title.trim() || !description.trim()}
                className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
              >
                {creating ? "Creating…" : "Create group"}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}
