"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { authService } from "@/src/services/authService";
import NotificationBell from "./NotificationBell";

export default function GlobalSessionActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      router.replace("/login");
      router.refresh();
      setBusy(false);
    }
  }

  return (
    <div className="fixed right-3 top-3 z-50 flex items-center gap-2 md:right-5 md:top-4">
      <NotificationBell />
      <button
        type="button"
        onClick={() => void logout()}
        disabled={busy}
        aria-label="Log out"
        title="Log out"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-[#111827] disabled:bg-[#E5E7EB] disabled:text-[#6B7280] md:w-auto md:gap-2 md:px-3"
      >
        <LogOut size={17} />
        <span className="hidden text-xs font-semibold md:inline">
          {busy ? "Signing out" : "Log out"}
        </span>
      </button>
    </div>
  );
}
