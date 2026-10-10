"use client";

import { useState } from "react";
import { profileService } from "../../services/profileService";
import type { FollowStatus } from "../../types/profile";

export default function FollowButton({
  userId,
  initialStatus,
  onStatusChange,
}: {
  userId: number;
  
  initialStatus: FollowStatus;
  onStatusChange: (status: FollowStatus) => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function toggleFollow() {
    setLoading(true);
    setError("");
    try {
      const result =
        status === "accepted"
          ? await profileService.unfollow(userId)
          : await profileService.follow(userId);
      setStatus(result.status);
      onStatusChange(result.status);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not update follow status",
      );
    } finally {
      setLoading(false);
    }
  }

  if (status === "pending") {
    return (
      <button
        disabled
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"
      >
        Request pending
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggleFollow}
        disabled={loading}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:bg-[#E5E7EB] disabled:text-[#6B7280] ${status === "accepted" ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
      >
        {loading ? "Saving…" : status === "accepted" ? "Unfollow" : "Follow"}
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-xs text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
