"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { profileService } from "../../services/profileService";
import type { FollowerSummary } from "../../types/profile";

type Relationship = "followers" | "following";

export default function FollowersModal({
  userId,
  relationship,
  onClose,
}: {
  userId: number;
  relationship: Relationship;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<FollowerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const request =
      relationship === "followers"
        ? profileService.getFollowers(userId)
        : profileService.getFollowing(userId);
    request
      .then((result) => {
        if (active) setUsers(result);
      })
      .catch((err: unknown) => {
        if (active)
          setError(err instanceof Error ? err.message : "Could not load users");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [relationship, userId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#E5E7EB] p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="relationship-title"
        className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="relationship-title" className="text-lg font-bold capitalize">
            {relationship}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-zinc-500 hover:bg-zinc-100"
          >
            ✕
          </button>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-zinc-500">Loading…</p>
        ) : error ? (
          <p role="alert" className="py-8 text-center text-sm text-red-600">
            {error}
          </p>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No {relationship} to show yet.
          </p>
        ) : (
          <ul className="mt-4 max-h-96 divide-y divide-zinc-100 overflow-y-auto">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {user.avatar_path ? (
                      <img
                        src={profileService.avatarURL(user.avatar_path)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      `${user.first_name[0] ?? "?"}${user.last_name[0] ?? ""}`
                    )}
                  </div>
                  <span className="truncate text-sm font-semibold">
                    {user.first_name} {user.last_name}
                  </span>
                </div>
                <Link
                  href={`/profile/${user.id}`}
                  onClick={onClose}
                  className="shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
