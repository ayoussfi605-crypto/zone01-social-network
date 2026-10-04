/* eslint-disable @next/next/no-img-element */

import { useWebSocket } from "@/src/context/WebSocketConetext";
import { authService } from "@/src/services/authService";
import { ChatMessage } from "@/src/types/chat";
import { FaceSlightlySmilingIcon, Send } from "lucide-react";
import { useState, useEffect, useRef, SetStateAction } from "react";
type User = {
  id: number | string;
  fullName?: string;
  avatar?: string;
  online?: boolean;
};

interface DiscussionWindowProps {
  UserData: User;
  DiscussionMessages: ChatMessage[];
  setChatMessages: (value: SetStateAction<ChatMessage[]>) => void;
}

export default function DiscussionWindow({
  UserData,
  DiscussionMessages,
  setChatMessages,
}: DiscussionWindowProps) {
  console.log("DiscussionMessages", DiscussionMessages);
  const [message, setMessage] = useState<string>("");

  const [Me, setMe] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };
  const ws = useWebSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    const GetMe = async () => {
      await authService
        .me()
        .then((user) => {
          if (user) {
            setMe(user.data);
          }
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
        });
    };
    GetMe();
  }, [DiscussionMessages]);

  const handleSend = () => {
    if (!message.trim() || !Me) return;

    const payload = {
      type: "message_private",
      message: message,
      receiver_id: UserData?.id,
      sender_id: Me?.id,
      sender_name: Me?.fullName,
    };
    ws.sendMessage(JSON.stringify(payload));

    setChatMessages((prevMessages) => [
      ...prevMessages,
      {
        type: "message_private",
        message: message,
        receiver_id: UserData?.id,
        sender_id: Me?.id,
        sender_name: Me?.fullName,
      },
    ]);
    setMessage("");
  };

  useEffect(() => {
    ws.receiveMessage((data: ChatMessage) => {
      if (data.type === "message_private") {
        setChatMessages((prevMessages) => [...prevMessages, data]);
      }
    });
  }, [ws, setChatMessages]);

  return (
    <div className="flex flex-col h-screen h-dvh w-full overflow-hidden bg-white">
      <div className="flex items-center justify-start p-3.5 border-b border-slate-200/60 shrink-0 h-16">
        <div className="image">
          <img
            className="h-10 w-10 rounded-full object-cover"
            src={"http://localhost:8080" + UserData?.avatar}
            alt={UserData?.fullName || "User avatar"}
          />
        </div>

        <div className="info ml-3">
          <h3 className="text-[15px] font-bold leading-tight">
            {UserData?.fullName}
          </h3>

          {UserData?.online ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="block h-2 w-2 rounded-full bg-green-600"></span>
              <p>online</p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="block h-2 w-2 rounded-full bg-gray-400"></span>
              <p>offline</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
          {DiscussionMessages?.map((msg, index) => {
            const isMe = Number(Me?.id) === msg.sender_id;

            return (
              <div
                key={index}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <span className="text-[12px] font-medium text-slate-500 mb-0.5 px-1">
                  {isMe
                    ? "You"
                    : msg.sender_name || UserData?.fullName || "User"}
                </span>

                <div
                  className={`p-3 max-w-[75%] rounded-2xl text-sm leading-relaxed shadow-sm break-words ${
                    isMe
                      ? "bg-[#1A1A1A] text-white rounded-br-xs"
                      : "bg-slate-100 text-slate-800 border border-slate-200/80 rounded-bl-xs"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="bg-[#F8FAFC] p-2.5 flex flex-col gap-1.5 rounded-2xl border border-slate-200/80 shadow-inner w-full">
            <div className="pb-1.5 flex text-[#9CA3AF] justify-start items-center gap-1.5 border-b border-slate-200/60">
              <img
                className="w-8 h-8 object-cover rounded-full"
                src={"http://localhost:8080" + UserData?.avatar}
                alt="avatar"
              />
              <input
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="outline-none border-none w-full p-1.5 bg-transparent text-slate-800 text-sm placeholder:text-slate-400"
                type="text"
                placeholder="Message..."
                value={message}
              />
              <FaceSlightlySmilingIcon className="w-5 h-5 cursor-pointer text-slate-400 hover:text-slate-600 transition" />
            </div>
            <div
              onClick={handleSend}
              className="px-5 max-w-fit ml-auto text-[12px] py-2 bg-[#1A1A1A] hover:bg-black text-white rounded-xl font-bold flex items-center gap-2 shadow-md shadow-black/10 transition scale-100 active:scale-95 shrink-0 cursor-pointer"
            >
              <button className="cursor-pointer">Send</button>
              <Send size={16} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
