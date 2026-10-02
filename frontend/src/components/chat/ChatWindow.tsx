/* eslint-disable @next/next/no-img-element */
"use client";

import { Pencil, Search } from "lucide-react";
import { useState } from "react";
import DiscussionWindow from "./DiscussionWindow";
import { ChatUsers } from "@/src/types/chat";

const INITIAL_CONTACTS: ChatUsers[] = [
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

// const INITIAL_MESSAGES = [
//   {
//     id: "m1",
//     senderId: "1",
//     text: "Hi everyone, today I was on most mountain in the world!",
//     time: "1:33 pm",
//     status: "read",
//   },
//   {
//     id: "m2",
//     senderId: "user",
//     text: "What's your classics?",
//     time: "1:35 pm",
//     status: "read",
//   },
//   {
//     id: "m3",
//     senderId: "1",
//     text: "Check out this stunning view from summit!",
//     image:
//       "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800",
//     time: "1:36 pm",
//     status: "read",
//   },
//   {
//     id: "m4",
//     senderId: "1",
//     text: "Hello I tell me my things are you waiting for us in? 😊",
//     time: "1:37 pm",
//     status: "read",
//   },
//   {
//     id: "m5",
//     senderId: "user",
//     text: "Noot",
//     time: "1:38 pm",
//     status: "read",
//   },
//   {
//     id: "m6",
//     senderId: "user",
//     text: "Hi everyone, today I was on the most beautiful mountain in the world 😄",
//     time: "1:39 pm",
//     status: "read",
//   },
// ];

export default function ChatWindow(users: {users:ChatUsers[]}) {
  console.log("from chat window ", users.users);

  const [ActiveUser, setActiveUser] = useState<string>(users.users[0]?.id);
  const [UsedUser, setUsedUser] = useState(
    users.users?.filter((el) => el.id == ActiveUser),
  );

  const ActiveClass = `bg-[#F0F4F8]! border-gray-400   shadow-sm!`;
  const UnActiveClass = `hover:bg-slate-50! border-blue-100/80! `;
  return (
    <div className=" flex">
      {/* <div className="w-screen p-3.5 flex justify-start border-b border-gray-400 ">
        <div className="flex flex-col justify-start items-start gap-1">
          <h1 className="text-[30px] font-bold ">Direct Messages</h1>
          <p className="text-[#6B7280] font-bold text-[15px]">
            Stay connected with your active workspace friends
          </p>
        </div>
        <div className="flex-1 flex justify-center items-center">
          <div>
            <button>groups</button> <button>privite chat</button>
          </div>
        </div>
      </div> */}
      <aside className="max-w-87.5 h-screen border-b border-r  border-slate-200/60 flex flex-col">
        <div className="p-3.5 border-b border-slate-200/60  flex items-center justify-center gap-3">
          <div className="flex text-[#6B7280] items-center justify-start gap-0.5 bg-[#F3F4F6] rounded-xl p-1">
            <Search size={18} />
            <input
              className=" border-0 outline-0 p-1"
              type="text"
              placeholder="Search"
            />
          </div>
          <div>
            <Pencil size={20} />
          </div>
        </div>
        <ul className="h-full flex flex-col gap-1 p-3 ">
          {users.users?.map((el) => (
            <div
              key={el.id}
              onClick={() => {
                setActiveUser(el.id);
                setUsedUser(
                  users.users.filter((el) => el.id == ActiveUser),
                );
                console.log(UsedUser);
              }}
              className={`group p-3 border  rounded-2xl flex items-center gap-3 cursor-pointer transition-all duration-200  ${ActiveUser == el.id ? ActiveClass : UnActiveClass}`}
            >
              <img
                className="w-12.5 h-12.5 rounded-full object-cover"
                src={el.avatar}
                alt="heloo"
              />
              <div className="flex  flex-col flex-1  gap-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-[15px] text-black capitalize">
                    {el.name}
                  </h3>
                  <p className="text-[12px] ">{el.time}</p>
                </div>
                <div className="flex justify-start items-center gap-5">
                  <p className="text-[12px] text-[#6B7280]">{el.lastMessage}</p>
                </div>
              </div>
              <div>
                <span className="text-white text-[12px] w-4.75 h-3.75 bg-black rounded-full flex justify-center items-center">
                  3
                </span>
              </div>
            </div>
          ))}
        </ul>
      </aside>

      <DiscussionWindow UserData={UsedUser[0]} />
    </div>
  );
}
