/* eslint-disable @next/next/no-img-element */
"use client";

import { Bell, Pencil, Search, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DiscussionWindow from "./DiscussionWindow";
import { ChatMessage, ChatUsers } from "@/src/types/chat";
import { ChatService } from "@/src/services/chatService";
import { useWebSocket } from "@/src/context/WebSocketConetext";
import { groupService } from "@/src/services/groupService";
import MobileBottomNav from "@/src/components/navigation/MobileBottomNav";

type ChatFilter = "all" | "users" | "groups";

type ChatContact = ChatUsers & {
  kind: "user" | "group";
  description?: string;
};

const DEFAULT_GROUPS: ChatContact[] = [
  {
    id: "group-design-circle",
    name: "Design Circle",
    fullName: "Design Circle",
    handle: "@design-circle",
    avatar:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=250",
    time: "2m ago",
    lastMessage: "New mockup review is ready.",
    unread: 3,
    online: true,
    kind: "group",
    description: "Product and UX conversations",
  },
  {
    id: "group-growth-lab",
    name: "Growth Lab",
    fullName: "Growth Lab",
    handle: "@growth-lab",
    avatar:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=250",
    time: "23m ago",
    lastMessage: "Campaign ideas are live.",
    unread: 1,
    online: true,
    kind: "group",
    description: "Marketing and launch updates",
  },
  {
    id: "group-ai-friends",
    name: "AI Friends",
    fullName: "AI Friends",
    handle: "@ai-friends",
    avatar:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=250",
    time: "1h ago",
    lastMessage: "New prompt library shared.",
    unread: 5,
    online: false,
    kind: "group",
    description: "Ideas, products, and experiments",
  },
];

export default function ChatWindow(users: { users: ChatUsers[] }) {
  const [chatUsers, setChatUsers] = useState(() => [...(users?.users ?? [])]);
  const { receiveMessage } = useWebSocket();

  const [UsedUser, setUsedUser] = useState<ChatUsers | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeFilter, setActiveFilter] = useState<ChatFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [groups, setGroups] = useState<ChatContact[]>(DEFAULT_GROUPS);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState("");

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

        const userId = String(event.user_id);
        const isOnline = event.online;
        setChatUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === userId ? { ...user, online: isOnline } : user,
          ),
        );
      }),
    [receiveMessage],
  );

  const contacts = useMemo<ChatContact[]>(() => {
    const mappedUsers = chatUsers.map((user) => ({
      ...user,
      kind: "user" as const,
    }));
    return [...mappedUsers, ...groups];
  }, [chatUsers, groups]);

  const filteredContacts = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return contacts.filter((contact) => {
      const kind = contact.kind ?? "user";
      const name = (contact.name ?? contact.fullName ?? "").toLowerCase();
      const fullName = (contact.fullName ?? "").toLowerCase();
      const handle = (contact.handle ?? "").toLowerCase();
      const description = (contact.description ?? "").toLowerCase();

      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "users" && kind === "user") ||
        (activeFilter === "groups" && kind === "group");

      const matchesSearch =
        !normalizedQuery ||
        name.includes(normalizedQuery) ||
        fullName.includes(normalizedQuery) ||
        handle.includes(normalizedQuery) ||
        description.includes(normalizedQuery);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, contacts, searchTerm]);

  function HandleGetMessages(id: string) {
    ChatService.getMessages(id).then((res) => {
      setChatMessages([...res?.data]);
    });
  }

  const inviteUsers = useMemo(() => {
    const normalizedQuery = memberSearchTerm.trim().toLowerCase();

    return chatUsers.filter((user) => {
      if (!normalizedQuery) {
        return true;
      }

      const name = (user.name ?? user.fullName ?? "").toLowerCase();
      const fullName = (user.fullName ?? "").toLowerCase();
      const handle = (user.handle ?? "").toLowerCase();

      return (
        name.includes(normalizedQuery) ||
        fullName.includes(normalizedQuery) ||
        handle.includes(normalizedQuery)
      );
    });
  }, [chatUsers, memberSearchTerm]);

  const visibleInviteUsers = inviteUsers.slice(0, 54);

  const handleToggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setIsCreatingGroup(true);
    setGroupError("");
    try {
      const createdGroup = await groupService.createGroup(
        newGroupName.trim(),
        newGroupDescription.trim(),
        selectedMembers.map(Number).filter(Number.isFinite),
      );
      const newGroup: ChatContact = {
        id: String(createdGroup.id),
        name: createdGroup.title,
        fullName: createdGroup.title,
        handle: `@${createdGroup.title.toLowerCase().replace(/\s+/g, "-")}`,
        avatar:
          "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=250",
        time: "now",
        lastMessage: selectedMembers.length
          ? "Invitations sent."
          : "Group created.",
        unread: 0,
        online: true,
        kind: "group",
        description: createdGroup.description,
      };

      setGroups((prev) => [newGroup, ...prev]);
      setNewGroupName("");
      setNewGroupDescription("");
      setSelectedMembers([]);
      setShowCreateGroup(false);
      setActiveFilter("groups");
    } catch (error) {
      setGroupError(
        error instanceof Error ? error.message : "Could not create group",
      );
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const ActiveClass = `bg-[#C2DCFB] border-gray-400`;
  const UnActiveClass = `hover:bg-white border-[#E5E7EB]`;

  return (
    <main className="min-h-dvh bg-white text-zinc-900">
      <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4">
        <Link
          href="/"
          className="text-lg font-black tracking-[0.18em] text-[#111827]"
        >
          VIBE
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-6 text-sm font-semibold text-[#6B7280] md:flex"
        >
          <Link href="/" className="hover:text-black">
            Home
          </Link>
          <Link href="/followers" className="hover:text-black">
            Explore
          </Link>
          <Link
            href="/chat"
            aria-current="page"
            className="border-b-2 border-black py-5 text-black"
          >
            Messages
          </Link>
          <Link href="/notifications" className="hover:text-black">
            Notifications
          </Link>
          <Link href="/profile" className="hover:text-black">
            Profile
          </Link>
        </nav>
        <Link
          href="/notifications"
          aria-label="Notifications"
          className="rounded-full p-2 text-zinc-700 md:hidden"
        >
          <Bell size={19} />
        </Link>
      </header>

      <div className="flex">
        <aside
          className={`${UsedUser ? "hidden md:flex" : "flex"} h-[calc(100dvh-128px)] w-full shrink-0 flex-col border-r border-slate-200 bg-white md:h-[calc(100dvh-64px)] md:w-[360px]`}
        >
          <div className="px-4 pb-2 pt-5">
            <h1 className="text-2xl font-bold text-[#111827]">Messages</h1>
            <p className="mt-1 text-xs text-[#6B7280]">
              Keep your conversations close
            </p>
          </div>
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-center gap-3">
            <div className="flex flex-1 text-[#6B7280] items-center justify-start gap-0.5 bg-[#E5E7EB] rounded-xl p-1">
              <Search size={18} />
              <input
                className="border-0 outline-0 p-1 bg-transparent w-full text-sm"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
              />
            </div>
            <Link
              href="/notifications"
              className="rounded-xl p-2 transition hover:bg-slate-100"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={20} className="text-slate-700" />
            </Link>
            <button
              type="button"
              onClick={() => setShowCreateGroup((prev) => !prev)}
              className="p-2 rounded-xl hover:bg-slate-100 transition"
              aria-label="Create a group"
            >
              <Pencil size={20} className="text-slate-700" />
            </button>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-200 p-3">
            {[
              { label: "All", value: "all" },
              { label: "Users", value: "users" },
              { label: "Groups", value: "groups" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveFilter(tab.value as ChatFilter)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  activeFilter === tab.value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {showCreateGroup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#E5E7EB] p-4">
              <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-800">
                    <Sparkles size={16} className="text-violet-600" />
                    Create group
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-4">
                  {groupError && (
                    <p
                      role="alert"
                      className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700"
                    >
                      {groupError}
                    </p>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                      Group name
                    </label>
                    <input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter a group name"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-300 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                      Description
                    </label>
                    <textarea
                      value={newGroupDescription}
                      onChange={(event) =>
                        setNewGroupDescription(event.target.value)
                      }
                      placeholder="What is this group for?"
                      rows={3}
                      className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-300 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                      Add members
                    </p>

                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                      <Search size={15} className="text-slate-400" />
                      <input
                        type="text"
                        value={memberSearchTerm}
                        onChange={(e) => setMemberSearchTerm(e.target.value)}
                        placeholder="Search other users"
                        className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                      />
                    </div>

                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
                      {visibleInviteUsers.length ? (
                        visibleInviteUsers.map((user) => {
                          const isSelected = selectedMembers.includes(user.id);
                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleToggleMember(user.id)}
                              className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition ${
                                isSelected
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  user.online
                                    ? "bg-emerald-500"
                                    : "bg-slate-300"
                                }`}
                              />
                              <span>{user.name}</span>
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-500">
                          No users found.
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    disabled={
                      isCreatingGroup ||
                      !newGroupName.trim() ||
                      !newGroupDescription.trim()
                    }
                    className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                  >
                    {isCreatingGroup ? "Creating…" : "Create group"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <ul className="h-full flex flex-col gap-1 p-3 overflow-y-scroll">
            {filteredContacts.length ? (
              filteredContacts.map((el) => (
                <div
                  key={el.id}
                  onClick={() => {
                    if (el.kind === "user") {
                      HandleGetMessages(el.id);
                      setUsedUser(el);
                      return;
                    }

                    setUsedUser(el);
                    setChatMessages([]);
                  }}
                  className={`group p-3 border rounded-2xl flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                    UsedUser?.id === el.id ? ActiveClass : UnActiveClass
                  }`}
                >
                  <img
                    className="w-12 h-12 rounded-full object-cover"
                    src={
                      el.avatar.startsWith("http")
                        ? el.avatar
                        : "http://localhost:8080" + el.avatar
                    }
                    alt={el.fullName}
                  />
                  <div className="flex flex-col flex-1 gap-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-[15px] text-black capitalize truncate">
                          {el.name}
                        </h3>
                        {el.kind === "group" && (
                          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                            Group
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] whitespace-nowrap">{el.time}</p>
                    </div>
                    <div className="flex justify-start items-center gap-5">
                      <p className="text-[12px] text-[#6B7280] truncate">
                        {el.lastMessage}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end min-w-[72px]">
                    {el.kind === "group" ? (
                      el.unread > 0 ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white">
                          {el.unread}
                        </span>
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                      )
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                          el.online
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            el.online ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {el.online ? "Online" : "Offline"}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-slate-500">
                  <Users size={24} className="mx-auto mb-2" />
                  <h3 className="font-medium">No results found</h3>
                </div>
              </div>
            )}
          </ul>
        </aside>

        {UsedUser ? (
          <DiscussionWindow
            UserData={UsedUser}
            setChatMessages={setChatMessages}
            DiscussionMessages={chatMessages}
            onBack={() => setUsedUser(null)}
          />
        ) : (
          <div className="hidden flex-1 items-center justify-center bg-[#F3F4F6] md:flex">
            <div className="text-center">
              <Users size={28} className="mx-auto text-[#6B7280]" />
              <h2 className="mt-3 text-sm font-semibold text-[#111827]">
                Select a conversation
              </h2>
              <p className="mt-1 text-xs text-[#6B7280]">
                Your messages will appear here.
              </p>
            </div>
          </div>
        )}
      </div>
      {!UsedUser && <MobileBottomNav active="messages" />}
    </main>
  );
}
