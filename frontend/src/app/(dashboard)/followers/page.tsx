/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWebSocket } from "@/src/context/WebSocketConetext";
import { profileService } from "@/src/services/profileService";
import type {
  DiscoverableUser,
  FollowStatus,
} from "@/src/types/profile";

type PeopleListProps = {
  title: string;
  people: DiscoverableUser[];
  followStatuses: Record<number, FollowStatus>;
  busyID: number | null;
  onToggleFollow: (person: DiscoverableUser) => void;
};

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? "?"}${lastName[0] ?? ""}`.toUpperCase();
}

function PeopleList({
  title,
  people,
  followStatuses,
  busyID,
  onToggleFollow,
}: PeopleListProps) {
  return (
    <section className="mb-4">
      <h2 className="mb-2 px-1 text-sm font-bold text-zinc-700">{title}</h2>
      {people.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center">
          <Users size={25} className="mx-auto text-zinc-500" />
          <p className="mt-3 text-sm font-semibold">No {title.toLowerCase()} found</p>
          <p className="mt-1 text-xs text-zinc-500">Try another search.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white px-4">
          {people.map((person) => {
            const status = followStatuses[person.id] ?? "none";
            return (
              <li key={person.id} className="flex items-center gap-3 py-4">
                <Link
                  href={`/profile/${person.id}`}
                  className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C2DCFB] text-sm font-bold text-[#111827]"
                >
                  {person.avatar_path ? (
                    <img
                      src={profileService.avatarURL(person.avatar_path)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials(person.first_name, person.last_name)
                  )}
                  {person.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#4ADE80]" />
                  )}
                </Link>
                <Link href={`/profile/${person.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#111827]">
                    {person.first_name} {person.last_name}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    @
                    {person.nickname ||
                      `${person.first_name}${person.last_name}`
                        .replace(/\s+/g, "")
                        .toLowerCase()}
                  </p>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${person.online ? "text-[#262626]" : "text-[#6B7280]"}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${person.online ? "bg-[#4ADE80]" : "bg-[#E5E7EB]"}`}
                    />
                    {person.online ? "ONLINE" : "OFFLINE"}
                  </span>
                </Link>
                <button
                  type="button"
                  disabled={busyID === person.id || status === "pending"}
                  onClick={() => onToggleFollow(person)}
                  className={`rounded-full px-3.5 py-2 text-xs font-bold ${status === "accepted" ? "border border-zinc-200 bg-white text-[#111827]" : status === "pending" ? "bg-[#E5E7EB] text-[#6B7280]" : "bg-black text-white"}`}
                >
                  {busyID === person.id
                    ? "Saving…"
                    : status === "accepted"
                      ? "Unfollow"
                      : status === "pending"
                        ? "Requested"
                        : "Follow"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function FollowersPage() {
  const router = useRouter();
  const { receiveMessage } = useWebSocket();
  const [users, setUsers] = useState<DiscoverableUser[]>([]);
  const [followStatuses, setFollowStatuses] = useState<
    Record<number, FollowStatus>
  >({});
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [busyID, setBusyID] = useState<number | null>(null);
  const [error, setError] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const searchVersionRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    const searchVersion = ++searchVersionRef.current;
    loadingMoreRef.current = true;
    async function loadUsers() {
      try {
        const page = await profileService.discoverUsers(10, 0, debouncedQuery);
        if (!active || searchVersion !== searchVersionRef.current) return;
        setUsers(page.users);
        setFollowStatuses(
          Object.fromEntries(
            page.users.map((person) => [person.id, person.follow_status]),
          ),
        );
        setOffset(page.users.length);
        setHasMore(page.has_more);
      } catch (reason: unknown) {
        if (!active || searchVersion !== searchVersionRef.current) return;
        const message =
          reason instanceof Error ? reason.message : "Could not load users";
        setError(message);
        if (message.toLowerCase().includes("not logged in")) {
          router.push("/login");
        }
      } finally {
        if (active && searchVersion === searchVersionRef.current) {
          setLoading(false);
          loadingMoreRef.current = false;
        }
      }
    }
    void loadUsers();
    return () => {
      active = false;
    };
  }, [debouncedQuery, router]);

  useEffect(
    () =>
      receiveMessage((event) => {
        if (
          event.type !== "presence" ||
          !("user_id" in event) ||
          typeof event.online !== "boolean"
        ) {
          return;
        }
        setUsers((current) =>
          current.map((person) =>
            person.id === event.user_id
              ? { ...person, online: event.online }
              : person,
          ),
        );
      }),
    [receiveMessage],
  );

  const visibleUsers = useMemo(
    () =>
      users.filter((person) => {
        const normalized = query.trim().toLowerCase();
        return (
          !normalized ||
          `${person.first_name} ${person.last_name} ${person.nickname}`
            .toLowerCase()
            .includes(normalized)
        );
      }),
    [users, query],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMoreRef.current) return;
    const searchVersion = searchVersionRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError("");
    try {
      const page = await profileService.discoverUsers(
        10,
        offset,
        debouncedQuery,
      );
      if (searchVersion !== searchVersionRef.current) return;
      setUsers((current) => {
        const existingIDs = new Set(current.map((person) => person.id));
        return [...current, ...page.users.filter((person) => !existingIDs.has(person.id))];
      });
      setFollowStatuses((current) => ({
        ...current,
        ...Object.fromEntries(
          page.users.map((person) => [person.id, person.follow_status]),
        ),
      }));
      setOffset((current) => current + page.users.length);
      setHasMore(page.has_more);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Could not load more users",
      );
    } finally {
      if (searchVersion === searchVersionRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [debouncedQuery, hasMore, loading, offset]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "240px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loading, loadingMore]);

  async function toggleFollow(person: DiscoverableUser) {
    const currentStatus = followStatuses[person.id] ?? "none";
    setBusyID(person.id);
    setError("");
    try {
      const result =
        currentStatus === "accepted"
          ? await profileService.unfollow(person.id)
          : await profileService.follow(person.id);
      setFollowStatuses((current) => ({
        ...current,
        [person.id]: result.status,
      }));
      setUsers((current) =>
        current.map((item) =>
          item.id === person.id ? { ...item, follow_status: result.status } : item,
        ),
      );
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not update follow status",
      );
    } finally {
      setBusyID(null);
    }
  }

  return (
    <main className="min-h-screen bg-white pb-24 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white session-actions-gap">
        <div className="mx-auto max-w-xl px-4 pb-3 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                Find your people
              </p>
              <h1 className="text-2xl font-bold">Explore</h1>
            </div>
            <Link
              href="/profile"
              className="text-xs font-semibold text-zinc-600"
            >
              Your profile
            </Link>
          </div>
          <label className="flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2.5 text-zinc-500">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                searchVersionRef.current += 1;
                loadingMoreRef.current = true;
                setLoading(true);
                setLoadingMore(false);
                setError("");
                setHasMore(false);
              }}
              placeholder="Search people"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#262626] outline-none placeholder:text-[#6B7280]"
            />
          </label>
        </div>
      </header>
      <div className="mx-auto max-w-xl px-3 py-3">
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-xl bg-[#F3F4F6] p-3 text-sm text-[#262626]"
          >
            {error}
          </p>
        )}
        {loading ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            Loading users…
          </p>
        ) : (
          <>
            {visibleUsers.length === 0 ? (
              error ? null : (
                <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center">
                  <Users size={25} className="mx-auto text-zinc-500" />
                  <p className="mt-3 text-sm font-semibold">No users found</p>
                  <p className="mt-1 text-xs text-zinc-500">Try another search.</p>
                </div>
              )
            ) : (
              <PeopleList
                title="Users"
                people={visibleUsers}
                followStatuses={followStatuses}
                busyID={busyID}
                onToggleFollow={toggleFollow}
              />
            )}
            <div ref={sentinelRef} aria-hidden="true" className="h-1" />
            {loadingMore && (
              <p className="py-4 text-center text-sm text-zinc-500">
                Loading more users…
              </p>
            )}
            {!hasMore && users.length > 0 && (
              <p className="py-4 text-center text-xs text-zinc-500">
                You’ve reached the end.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
