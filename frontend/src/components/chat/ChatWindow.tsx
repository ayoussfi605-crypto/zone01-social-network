/* eslint-disable @next/next/no-img-element */
"use client";

import { Bell, Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DiscussionWindow from "./DiscussionWindow";
import { ChatMessage, ChatUsers } from "@/src/types/chat";
import { ChatService } from "@/src/services/chatService";
import { useWebSocket } from "@/src/context/WebSocketConetext";

type ChatContact = ChatUsers & {
  kind: "user" | "group";
  description?: string;
};

export default function ChatWindow(users: { users: ChatUsers[] }) {
  const [chatUsers, setChatUsers] = useState(() => [...(users?.users ?? [])]);
  const { receiveMessage } = useWebSocket();

  const [UsedUser, setUsedUser] = useState<ChatUsers | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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
    return [...mappedUsers];
  }, [chatUsers]);

  function HandleGetMessages(id: string) {
    ChatService.getMessages(id).then((res) => {
      setChatMessages([...res?.data]);
    });
  }

  const ActiveClass = `bg-[#C2DCFB] border-gray-400`;
  const UnActiveClass = `hover:bg-white border-[#E5E7EB]`;

  return (
    <main className="min-h-dvh bg-white text-zinc-900">
      <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white pl-4 session-actions-gap">
        <Link
          href="/"
          className="text-lg font-black tracking-[0.18em] text-[#111827]"
        >
          Socil Network
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
          </div>

          <div className="flex items-center gap-2 border-b border-slate-200 p-3">
            <button
              type="button"
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${"bg-slate-900 text-white"}`}
            >
              Users
            </button>
          </div>

          <ul className="h-full flex flex-col gap-1 p-3 overflow-y-scroll">
            {contacts.length ? (
              contacts.map((el) => (
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
                    alt={"avarate"}
                  />
                  <div className="flex flex-col flex-1 gap-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-[15px] text-black capitalize truncate">
                          {el.name ? el.name : el.fullName.split(" ")[0]}
                        </h3>
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
                    {
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
                    }
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
    </main>
  );
}
