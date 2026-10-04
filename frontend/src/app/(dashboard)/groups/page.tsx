"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { groupService } from "@/src/services/groupService";
import type { GroupDiscovery } from "@/src/types/group";

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupDiscovery[]>([]);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyGroupID, setBusyGroupID] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    groupService
      .browseGroups()
      .then((result) => {
        if (active) setGroups(Array.isArray(result) ? result : []);
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

  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groups;
    return groups.filter((group) =>
      `${group.title} ${group.description}`.toLowerCase().includes(normalized),
    );
  }, [groups, query]);

  async function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setCreating(true);
    setError("");
    try {
      const group = await groupService.createGroup(
        title.trim(),
        description.trim(),
        [],
      );
      router.push(`/groups/${group.id}`);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Could not create group",
      );
    } finally {
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

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <nav className="mb-4 flex gap-4 text-sm font-semibold text-zinc-600">
              <Link href="/chat" className="hover:text-zinc-900">
                Chat
              </Link>
              <Link href="/notifications" className="hover:text-zinc-900">
                Notifications
              </Link>
            </nav>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Community
            </p>
            <h1 className="mt-1 text-3xl font-bold">Groups</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-600">
              Browse communities, request to join, or start one of your own.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
            <Users size={16} /> {groups.length}{" "}
            {groups.length === 1 ? "group" : "groups"}
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-zinc-200 bg-[#F3F4F6] p-3 text-sm text-zinc-800"
          >
            {error}
          </p>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Discover groups</h2>
              <label className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 sm:w-64">
                <Search size={16} className="text-zinc-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search groups"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"
                />
              </label>
            </div>

            {loading ? (
              <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
                Loading groups…
              </p>
            ) : visibleGroups.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
                <Building2 size={24} className="mx-auto text-zinc-500" />
                <p className="mt-3 font-semibold">No groups found</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Try another search or create the first group.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white px-5">
                {visibleGroups.map((group) => (
                  <li
                    key={group.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-bold">{group.title}</h3>
                        {(group.is_creator ||
                          group.membership_status === "member") && (
                          <span className="rounded-full bg-[#C2DCFB] px-2 py-0.5 text-xs font-semibold text-zinc-800">
                            Member
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                        {group.description}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        {group.member_count}{" "}
                        {group.member_count === 1 ? "member" : "members"}
                      </p>
                    </div>
                    {group.membership_status === "member" ? (
                      <Link
                        href={`/groups/${group.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white"
                      >
                        Open group <span aria-hidden="true">→</span>
                      </Link>
                    ) : group.membership_status === "pending_invite" ? (
                      <Link
                        href="/notifications"
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700"
                      >
                        View invite
                      </Link>
                    ) : group.membership_status === "pending_request" ? (
                      <button
                        type="button"
                        disabled
                        className="rounded-lg border border-zinc-200 bg-[#E5E7EB] px-3 py-2 text-sm font-semibold text-zinc-600"
                      >
                        Request pending
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyGroupID === group.id}
                        onClick={() => void requestToJoin(group.id)}
                        className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                      >
                        {busyGroupID === group.id
                          ? "Sending…"
                          : "Request to join"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="mb-5 flex items-center gap-2">
              <Plus size={18} />
              <h2 className="font-bold">Create a group</h2>
            </div>
            <form
              onSubmit={(event) => void createGroup(event)}
              className="space-y-4"
            >
              <label className="block text-sm font-semibold">
                Title
                <input
                  required
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
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
                  className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-black"
                />
              </label>
              <button
                type="submit"
                disabled={creating || !title.trim() || !description.trim()}
                className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
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
