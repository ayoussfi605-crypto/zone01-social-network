/* eslint-disable @next/next/no-img-element */

import { useWebSocket } from "@/src/context/WebSocketConetext";
import { authService } from "@/src/services/authService";
import { ChatEvent, ChatMessage } from "@/src/types/chat";
import { ArrowLeft, ImagePlus, Paperclip, Send } from "lucide-react";
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
  onBack: () => void;
}

export default function DiscussionWindow({
  UserData,
  DiscussionMessages,
  setChatMessages,
  onBack,
}: DiscussionWindowProps) {
  console.log("DiscussionMessages", DiscussionMessages);
  const [message, setMessage] = useState<string>("");

  const [Me, setMe] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [attachmentName, setAttachmentName] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };
  const { sendMessage, receiveMessage } = useWebSocket();

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
    if ((!message.trim() && !attachmentName) || !Me) return;
    const messageContent = [
      message.trim(),
      attachmentName ? `[Attachment: ${attachmentName}]` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const payload = {
      type: "message_private",
      message: messageContent,
      receiver_id: UserData?.id,
      sender_id: Me?.id,
      sender_name: Me?.fullName,
    };
    sendMessage(JSON.stringify(payload));

    setChatMessages((prevMessages) => [
      ...prevMessages,
      {
        type: "message_private",
        message: messageContent,
        receiver_id: UserData?.id,
        sender_id: Me?.id,
        sender_name: Me?.fullName,
      },
    ]);
    setMessage("");
    setAttachmentName("");
  };

  useEffect(() => {
    return receiveMessage((data: ChatEvent) => {
      if (!("message" in data) || data.type !== "message_private") return;

      const isMyConversation =
        (Number(data.sender_id) === Number(Me?.id) &&
          Number(data.receiver_id) === Number(UserData.id)) ||
        (Number(data.sender_id) === Number(UserData.id) &&
          Number(data.receiver_id) === Number(Me?.id));

      if (!isMyConversation) return;

      setChatMessages((prevMessages) => [...prevMessages, data]);
    });
  }, [receiveMessage, Me?.id, UserData.id, setChatMessages]);

  return (
    <div className="flex h-[calc(100dvh-64px)] min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-start p-3.5 border-b border-slate-200 shrink-0 h-16">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to messages"
          className="mr-2 flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 md:hidden"
        >
          <ArrowLeft size={19} />
        </button>
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
              <span className="block h-2 w-2 rounded-full bg-[#4ADE80]"></span>
              <p>online</p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="block h-2 w-2 rounded-full bg-[#6B7280]"></span>
              <p>offline</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
          {DiscussionMessages?.map((msg, index) => {
            const isMe = Number(Me?.id) === Number(msg.sender_id);

            console.log("msg  ", msg);

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
                  className={`p-3 max-w-[75%] rounded-2xl text-sm leading-relaxed break-words ${
                    isMe
                      ? "bg-[#E5E7EB] text-[#262626] rounded-br-xs"
                      : "bg-[#C2DCFB] text-[#111827] border border-[#C2DCFB] rounded-bl-xs"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
          {attachmentName && (
            <p className="mx-auto mb-2 max-w-3xl text-xs text-[#6B7280]">
              Attached: {attachmentName}
            </p>
          )}
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              aria-label="Attach a file"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6B7280]"
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              aria-label="Attach an image"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6B7280]"
            >
              <ImagePlus size={18} />
            </button>
            <input
              ref={attachmentInputRef}
              type="file"
              className="hidden"
              onChange={(event) =>
                setAttachmentName(event.target.files?.[0]?.name ?? "")
              }
            />
            <input
              onChange={handleInputChange}
              onKeyDown={(event) => event.key === "Enter" && handleSend()}
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[#262626] outline-none placeholder:text-[#6B7280]"
              type="text"
              placeholder="Type a message..."
              value={message}
            />
            <button
              type="button"
              onClick={handleSend}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white"
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
