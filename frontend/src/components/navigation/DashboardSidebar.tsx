"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Compass,
  House,
  MessageCircle,
  Plus,
  UserRound,
  Users,
} from "lucide-react";

const items = [
  { href: "/", label: "Home", Icon: House },
  { href: "/followers", label: "Explore", Icon: Compass },
  { href: "/chat", label: "Messages", Icon: MessageCircle },
  { href: "/notifications", label: "Notifications", Icon: Bell },
  { href: "/groups", label: "Groups", Icon: Users },
  { href: "/profile", label: "Profile", Icon: UserRound },
] as const;

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-r border-zinc-200 bg-white px-5 py-7 md:flex">
      <Link
        href="/"
        className="mb-9 text-2xl font-black tracking-[0.2em] text-[#111827]"
      >
        VIBE
      </Link>
      <nav aria-label="Main navigation" className="space-y-1">
        {items.map(({ href, label, Icon }) => {
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(`${href}/`));

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? "bg-[#F3F4F6] text-black" : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"}`}
            >
              <Icon size={19} strokeWidth={active ? 2.4 : 1.8} /> {label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/create-post"
        className="mt-7 flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-bold text-white"
      >
        <Plus size={17} /> Create Post
      </Link>
    </aside>
  );
}
