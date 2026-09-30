"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Rss,
  MessageSquare,
  MessagesSquare,
  Users,
  Image as ImageIcon,
  Settings,
  Search,
  SquarePen,
  Phone,
  MoreVertical,
  Paperclip,
  MapPin,
  Globe,
  Send,
  Smile,
  Check,
  CheckCheck,
  Code2,
  Compass,
  UtensilsCrossed,
  Mountain,
  ChevronDown,
  Download,
  Plus,
  Heart,
  X,
} from "lucide-react";

const INITIAL_CONTACTS = [
  {
    id: "1",
    name: "Anatoly P...",
    fullName: "Anatoly Prokopenko",
    handle: "@anatoly_pr",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
    time: "1:50 pm",
    lastMessage: "Hi everyone, today I was on most mountain in the world!",
    unread: 5,
    online: true,
    coverPhoto:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: "2",
    name: "Lolita Earns",
    fullName: "Lolita Earns",
    handle: "@lolita_e",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250",
    time: "13 pm",
    lastMessage: "What's your classics playlist looking like today?",
    unread: 4,
    online: true,
  },
  {
    id: "3",
    name: "George Lobko",
    fullName: "George Lobko",
    handle: "@george_l",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250",
    time: "12 pm",
    lastMessage: "Check out these photo samples from the hike!",
    unread: 2,
    online: false,
  },
  {
    id: "4",
    name: "Nick Shelburne",
    fullName: "Nick Shelburne",
    handle: "@nickshel",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250",
    time: "18 pm",
    lastMessage: "Are we still meeting for coffee tomorrow afternoon?",
    unread: 3,
    online: true,
  },
  {
    id: "5",
    name: "Silena Davis",
    fullName: "Silena Davis",
    handle: "@silenad",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=250",
    time: "23 pm",
    lastMessage: "Last message will show here when updated...",
    unread: 0,
    online: false,
  },
];

const INITIAL_MESSAGES = {
  "1": [
    {
      id: "m1",
      senderId: "1",
      text: "Hi everyone, today I was on most mountain in the world!",
      time: "1:33 pm",
      status: "read",
    },
    {
      id: "m2",
      senderId: "user",
      text: "What's your classics?",
      time: "1:35 pm",
      status: "read",
    },
    {
      id: "m3",
      senderId: "1",
      text: "Check out this stunning view from summit!",
      image:
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800",
      time: "1:36 pm",
      status: "read",
    },
    {
      id: "m4",
      senderId: "1",
      text: "Hello I tell me my things are you waiting for us in? 😊",
      time: "1:37 pm",
      status: "read",
    },
    {
      id: "m5",
      senderId: "user",
      text: "Noot",
      time: "1:38 pm",
      status: "read",
    },
    {
      id: "m6",
      senderId: "user",
      text: "Hi everyone, today I was on the most beautiful mountain in the world 😄",
      time: "1:39 pm",
      status: "read",
    },
  ],
};

const SUGGESTED_FRIENDS = [
  {
    id: "sf1",
    name: "Nick Shelburne",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250",
    following: false,
  },
  {
    id: "sf2",
    name: "Brittni Lando",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
    following: false,
  },
  {
    id: "sf3",
    name: "Ivan Shevchenko",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250",
    following: true,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("messages");
  const [activeContactId, setActiveContactId] = useState("1");
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [messagesMap, setMessagesMap] = useState(INITIAL_MESSAGES);
  const [inputMessage, setInputMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [privacySetting, setPrivacySetting] = useState("Public");
  const [followingState, setFollowingState] = useState({
    sf1: false,
    sf2: false,
    sf3: true,
  });

  const chatBottomRef = useRef(null);

  // Auto scroll to latest message when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesMap, activeContactId]);

  const activeContact =
    contacts.find((c) => c.id === activeContactId) || contacts[0];
  const activeMessages = messagesMap[activeContactId] || [];

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: `msg-${Date.now()}`,
      senderId: "user",
      text: inputMessage,
      time: new Date()
        .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        .toLowerCase(),
      status: "sent",
    };

    setMessagesMap((prev) => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), newMessage],
    }));

    // Update last message in contacts list
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === activeContactId) {
          return { ...c, lastMessage: inputMessage, time: "Just now" };
        }
        return c;
      }),
    );

    setInputMessage("");
  };

  const toggleFollow = (id) => {
    setFollowingState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#CBD5E1] via-[#E2E8F0] to-[#D8B4FE]/30 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 font-sans antialiased selection:bg-[#C2DCFB]">
      {/* Main Glass/Soft Elevated App Dashboard Box */}
      <div className="w-full max-w-[1440px] bg-white rounded-[28px] sm:rounded-[36px] shadow-2xl shadow-slate-400/20 overflow-hidden flex flex-col lg:flex-row border border-white/60 min-h-[850px] max-h-[920px]">
        {}
        <aside className="w-full lg:w-[260px] xl:w-[280px] bg-[#FAFAFC] p-5 lg:p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100 shrink-0">
          <div>
            {/* User Profile Summary Header */}
            <div className="flex flex-col items-center text-center pt-2 pb-6">
              <div className="relative mb-3 group cursor-pointer">
                {/* Colorful ambient halo background effect */}
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#C4B5FD] via-[#FDE047] to-[#86EFAC] opacity-75 blur-md group-hover:opacity-100 transition duration-300"></div>
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250"
                  alt="Bogdan Nikitin Avatar"
                  className="relative w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                />
              </div>
              <h2 className="text-base font-bold text-[#111827] tracking-tight">
                Bogdan Nikitin
              </h2>
              <p className="text-xs font-medium text-[#9CA3AF]">@nikitinteam</p>
            </div>

            {/* Navigation Menu Links */}
            <nav className="space-y-1.5">
              {[
                { id: "feed", label: "News Feed", icon: Rss, badge: null },
                {
                  id: "messages",
                  label: "Messages",
                  icon: MessageSquare,
                  badge: 6,
                },
                {
                  id: "forums",
                  label: "Forums",
                  icon: MessagesSquare,
                  badge: null,
                },
                { id: "friends", label: "Friends", icon: Users, badge: 3 },
                { id: "media", label: "Media", icon: ImageIcon, badge: null },
                {
                  id: "settings",
                  label: "Settings",
                  icon: Settings,
                  badge: null,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-[#1A1A1A] text-white shadow-lg shadow-black/10 scale-[1.02]"
                        : "text-[#6B7280] hover:bg-slate-100 hover:text-[#111827]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${isActive ? "text-white" : "text-[#6B7280]"}`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white text-[#1A1A1A]"
                            : "bg-[#1A1A1A] text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Card Promo Banner ("Download the App") */}
          <div className="mt-6 pt-4 border-t border-slate-100 hidden sm:block">
            <div className="bg-gradient-to-br from-[#FAF5FF] via-[#F3E8FF] to-[#E0E7FF] p-4 rounded-2xl relative overflow-hidden border border-purple-100/50 shadow-sm text-center">
              {/* Floating Mini User Avatars */}
              <div className="flex justify-center -space-x-2 mb-2">
                <img
                  className="w-7 h-7 rounded-full border-2 border-white object-cover"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100"
                  alt="user1"
                />
                <img
                  className="w-7 h-7 rounded-full border-2 border-white object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100"
                  alt="user2"
                />
                <img
                  className="w-7 h-7 rounded-full border-2 border-white object-cover"
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100"
                  alt="user3"
                />
              </div>
              <p className="text-xs font-bold text-[#111827] mb-1">
                Download the App
              </p>
              <p className="text-[10px] text-[#6B7280] mb-3">
                Get seamless social experience on mobile
              </p>
              <button className="w-full py-2 bg-[#1A1A1A] hover:bg-black text-white text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1.5 transition">
                <Download className="w-3.5 h-3.5" /> Get Mobile App
              </button>
            </div>
          </div>
        </aside>

        {}
        <main className="flex-1 flex flex-col bg-[#F8FAFC] border-r border-slate-100 min-w-0 overflow-hidden">
          {/* Top Panel Bar */}
          <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h1 className="text-xl font-bold text-[#111827] tracking-tight">
                Direct Messages
              </h1>
              <p className="text-xs text-[#9CA3AF] font-medium hidden sm:block">
                Stay connected with your active workspace friends
              </p>
            </div>

            {/* Quick Filter Navigation Tabs */}
            <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl text-xs font-semibold text-[#6B7280]">
              <button className="px-3 py-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] transition">
                Recents
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-white text-[#111827] shadow-sm font-bold">
                Friends
              </button>
              <button className="px-3 py-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] transition hidden sm:block">
                People
              </button>
            </div>
          </div>

          {/* Combined Dual Panel: Contacts List + Active Chat Section */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Contacts Sub-column */}
            <div className="w-full md:w-80 lg:w-72 xl:w-80 bg-white border-r border-slate-100 flex flex-col shrink-0">
              {/* Search Bar & New Chat Action */}
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full bg-[#F1F5F9] text-xs font-medium text-[#111827] placeholder-[#9CA3AF] pl-9 pr-3 py-2.5 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 transition"
                  />
                </div>
                <button className="p-2.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 text-[#111827] transition">
                  <SquarePen className="w-4 h-4" />
                </button>
              </div>

              {/* Contact List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredContacts.map((contact) => {
                  const isSelected = contact.id === activeContactId;
                  return (
                    <div
                      key={contact.id}
                      onClick={() => setActiveContactId(contact.id)}
                      className={`group p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "bg-[#F0F4F8] border border-blue-100/80 shadow-sm"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-11 h-11 rounded-full object-cover shadow-sm"
                        />
                        {contact.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#4ADE80] border-2 border-white rounded-full"></span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3
                            className={`text-xs font-bold truncate ${isSelected ? "text-[#111827]" : "text-[#374151]"}`}
                          >
                            {contact.name}
                          </h3>
                          <span className="text-[10px] text-[#9CA3AF] font-medium shrink-0 ml-1">
                            {contact.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B7280] truncate font-medium">
                          {contact.lastMessage}
                        </p>
                      </div>

                      {contact.unread > 0 && (
                        <div className="shrink-0 w-5 h-5 bg-[#1A1A1A] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                          {contact.unread}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {}
            <div className="flex-1 flex flex-col bg-[#F8FAFC] min-w-0">
              {/* Active Conversation Top Navigation Header */}
              <div className="px-6 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={activeContact.avatar}
                      alt={activeContact.name}
                      className="w-10 h-10 rounded-full object-cover shadow-sm"
                    />
                    {activeContact.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#4ADE80] border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#111827]">
                      {activeContact.fullName}
                    </h2>
                    <p className="text-[11px] font-semibold text-[#4ADE80] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full inline-block"></span>
                      {activeContact.online ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#6B7280]">
                  <button className="p-2 hover:bg-slate-100 rounded-xl transition text-[#111827]">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-slate-100 rounded-xl transition text-[#111827]">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message History Feed Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Date Divider Tag */}
                <div className="flex justify-center my-2">
                  <span className="text-[10px] font-bold text-[#9CA3AF] bg-slate-200/60 px-3 py-1 rounded-full uppercase tracking-wider">
                    Today
                  </span>
                </div>

                {activeMessages.map((msg) => {
                  const isUser = msg.senderId === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {!isUser && (
                        <img
                          src={activeContact.avatar}
                          alt="avatar"
                          className="w-7 h-7 rounded-full object-cover mb-1 shrink-0 shadow-xs"
                        />
                      )}

                      <div
                        className={`max-w-[82%] sm:max-w-[70%] flex flex-col ${isUser ? "items-end" : "items-start"}`}
                      >
                        {/* Message Bubble Card */}
                        <div
                          className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-xs ${
                            isUser
                              ? "bg-[#1A1A1A] text-white rounded-br-none"
                              : "bg-[#C2DCFB] text-[#1E293B] rounded-bl-none"
                          }`}
                        >
                          {msg.text && (
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          )}

                          {/* Image Media Attachment Card if Present */}
                          {msg.image && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-white/40 shadow-sm max-w-sm">
                              <img
                                src={msg.image}
                                alt="Shared attached media"
                                className="w-full max-h-56 object-cover hover:scale-105 transition duration-300 cursor-pointer"
                              />
                            </div>
                          )}
                        </div>

                        {/* Timestamp & Read Receipts */}
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-[#9CA3AF] font-semibold px-1">
                          <span>{msg.time}</span>
                          {isUser && (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={chatBottomRef} />
              </div>

              {/* Floating Bottom Input & Composer Container */}
              <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                <form
                  onSubmit={handleSendMessage}
                  className="bg-[#F8FAFC] p-2.5 rounded-2xl border border-slate-200/80 shadow-inner"
                >
                  {/* Text Input Row */}
                  <div className="flex items-center gap-2 px-2 pb-2">
                    <img
                      src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"
                      alt="Me"
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Share something..."
                      className="w-full bg-transparent text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none font-medium"
                    />
                    <button
                      type="button"
                      className="text-[#9CA3AF] hover:text-[#111827] transition p-1"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Attachment Toolbar Buttons & Send Pill */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] font-semibold text-[#6B7280]">
                    <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
                      <button
                        type="button"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-200/60 transition text-[#374151]"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">File</span>
                      </button>

                      <button
                        type="button"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-200/60 transition text-[#374151]"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Image</span>
                      </button>

                      <button
                        type="button"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-200/60 transition text-[#374151]"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Location</span>
                      </button>

                      {/* Public Toggle dropdown pill */}
                      <button
                        type="button"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-200/60 transition text-[#374151]"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>{privacySetting}</span>
                        <ChevronDown className="w-3 h-3 text-[#9CA3AF]" />
                      </button>
                    </div>

                    {/* Send Action CTA */}
                    <button
                      type="submit"
                      disabled={!inputMessage.trim()}
                      className="px-5 py-2 bg-[#1A1A1A] hover:bg-black disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-black/10 transition scale-100 active:scale-95 shrink-0"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>

        {}
        <aside className="w-full lg:w-[300px] xl:w-[320px] bg-[#FAFAFC] p-5 lg:p-6 flex flex-col space-y-6 shrink-0 border-t lg:border-t-0 border-slate-100 overflow-y-auto">
          {/* Active Contacts Section (Horizontal Avatars Grid) */}
          <div>
            <h3 className="text-xs font-extrabold text-[#111827] uppercase tracking-wider mb-3">
              Active Contacts
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {contacts.slice(0, 3).map((person) => (
                <div
                  key={person.id}
                  className="flex flex-col items-center text-center p-2 rounded-2xl hover:bg-slate-100 transition cursor-pointer"
                >
                  <div className="relative mb-1">
                    <img
                      src={person.avatar}
                      alt={person.name}
                      className="w-12 h-12 rounded-full object-cover shadow-sm border-2 border-white"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#4ADE80] border-2 border-white rounded-full"></span>
                  </div>
                  <span className="text-[11px] font-bold text-[#111827] truncate w-full">
                    {person.name.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pinned / Suggested Friends Section */}
          <div className="pt-2 border-t border-slate-200/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold text-[#111827] uppercase tracking-wider">
                Pinned Friends
              </h3>
              <button className="text-[10px] font-bold text-[#6B7280] hover:text-[#111827]">
                See all
              </button>
            </div>

            <div className="space-y-3">
              {SUGGESTED_FRIENDS.map((friend) => {
                const isFollowing = followingState[friend.id];
                return (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <span className="text-xs font-bold text-[#111827] truncate">
                        {friend.name}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleFollow(friend.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition shadow-xs ${
                        isFollowing
                          ? "bg-slate-200 text-[#374151] hover:bg-slate-300"
                          : "bg-[#1A1A1A] text-white hover:bg-black"
                      }`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {}
          <div className="pt-2 border-t border-slate-200/60">
            <h3 className="text-xs font-extrabold text-[#111827] uppercase tracking-wider mb-3">
              Recommendations
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Cooking Card (Beige Background) */}
              <div className="bg-[#FFF8EC] p-3.5 rounded-2xl flex flex-col items-center justify-center text-center hover:scale-105 transition cursor-pointer border border-amber-100/50 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-amber-100/80 flex items-center justify-center mb-1.5 text-amber-700">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#111827]">
                  Cooking
                </span>
              </div>

              {/* Hiking Card (Lavender Background) */}
              <div className="bg-[#C4B5FD]/25 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center hover:scale-105 transition cursor-pointer border border-purple-200/50 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-purple-200/60 flex items-center justify-center mb-1.5 text-purple-700">
                  <Mountain className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#111827]">Hiking</span>
              </div>

              {/* Coding Card (Soft Blue Background) */}
              <div className="bg-[#E0F2FE] p-3.5 rounded-2xl flex flex-col items-center justify-center text-center hover:scale-105 transition cursor-pointer border border-sky-200/50 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-sky-200/60 flex items-center justify-center mb-1.5 text-sky-700">
                  <Code2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#111827]">Coding</span>
              </div>

              {/* Travel Card (Light Slate/Blue Background) */}
              <div className="bg-[#F0F4F8] p-3.5 rounded-2xl flex flex-col items-center justify-center text-center hover:scale-105 transition cursor-pointer border border-slate-200/50 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mb-1.5 text-slate-700">
                  <Compass className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#111827]">Travel</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
