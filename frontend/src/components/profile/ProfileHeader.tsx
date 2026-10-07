"use client";

import { UserRound } from "lucide-react";
import { profileService } from "../../services/profileService";
import type { User } from "../../types/user";
import type { FollowStatus } from "../../types/profile";
import FollowButton from "./FollowButton";

export default function ProfileHeader({
  user,
  followStatus,
  onFollowStatusChange,
}: {
  user: User;
  followStatus: FollowStatus;
  onFollowStatusChange: (status: FollowStatus) => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
      <div className="h-32 bg-[#C2DCFB]" />
      <div className="px-6 pb-6">
        <div className="-mt-12 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-indigo-100 text-2xl font-extrabold text-indigo-700">
          {user.avatar_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileService.avatarURL(user.avatar_path)}
              alt={`${user.first_name} ${user.last_name}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound className="h-12 w-12" aria-label="User avatar" />
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold text-zinc-900">
            {user.first_name} {user.last_name}
          </h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${user.is_private ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
          >
            {user.is_private ? "🔒 Private profile" : "🌍 Public profile"}
          </span>
        </div>
        {user.nickname && (
          <p className="mt-1 text-sm font-medium text-indigo-600">
            @{user.nickname.replace(/^@/, "")}
          </p>
        )}
        {user.about_me && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            {user.about_me}
          </p>
        )}
        {(user.email || user.dob) && (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {user.email && (
              <div>
                <dt className="text-xs font-semibold text-zinc-500">Email</dt>
                <dd className="mt-1 break-words text-zinc-800">
                  {user.email}
                </dd>
              </div>
            )}
            {user.dob && (
              <div>
                <dt className="text-xs font-semibold text-zinc-500">
                  Date of birth
                </dt>
                <dd className="mt-1 text-zinc-800">
                  <time dateTime={user.dob}>{user.dob}</time>
                </dd>
              </div>
            )}
          </dl>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <FollowButton
            key={user.id}
            userId={user.id}
            initialStatus={followStatus}
            onStatusChange={onFollowStatusChange}
          />
        </div>
      </div>
    </section>
  );
}
