"use client";

import { UserRound } from "lucide-react";
import { profileService } from "../../services/profileService";
import type { User } from "../../types/user";
import type { FollowStatus } from "../../types/profile";
import FollowButton from "./FollowButton";
import PrivacyToggle from "./PrivacyToggle";

export default function ProfileHeader({
  user,
  isOwner,
  followStatus,
  onUserChange,
  onFollowStatusChange,
}: {
  user: User;
  isOwner: boolean;
  followStatus: FollowStatus;
  onUserChange: (user: User) => void;
  onFollowStatusChange: (status: FollowStatus) => void;
}) {
  return (
    <>
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
              @{user.nickname}
            </p>
          )}
          {!user.is_private || isOwner || followStatus === "accepted" ? (
            <>
              {user.about_me && (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                  {user.about_me}
                </p>
              )}
              <p className="mt-2 text-sm text-zinc-500">{user.email}</p>
            </>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {isOwner ? (
              <PrivacyToggle user={user} onChange={onUserChange} />
            ) : (
              <FollowButton
                userId={user.id}
                initialStatus={followStatus}
                onStatusChange={onFollowStatusChange}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
