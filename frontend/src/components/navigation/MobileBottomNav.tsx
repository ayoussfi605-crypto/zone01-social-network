"use client";

import Link from "next/link";
import { Bell, Compass, House, MessageCircle, UserRound } from "lucide-react";

type MobileBottomNavProps = {
  active: "feed" | "messages" | "people" | "notifications" | "profile";
};

const items = [
  { id: "feed", href: "/", label: "Home", Icon: House },
  { id: "messages", href: "/chat", label: "Messages", Icon: MessageCircle },
  { id: "people", href: "/followers", label: "Explore", Icon: Compass },
  { id: "notifications", href: "/notifications", label: "Alerts", Icon: Bell },
  { id: "profile", href: "/profile", label: "Profile", Icon: UserRound },
] as const;

export default function MobileBottomNav({ active }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-zinc-200 bg-white px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 md:hidden"
    >
      {items.map(({ id, href, label, Icon }) => (
        <Link
          key={id}
          href={href}
          aria-current={active === id ? "page" : undefined}
          className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
            active === id ? "text-black" : "text-zinc-500"
          }`}
        >
          <Icon size={19} strokeWidth={active === id ? 2.4 : 1.8} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
