/* eslint-disable @next/next/no-img-element */

import { useWebSocket } from "@/src/context/WebSocketConetext";
import { FaceSlightlySmilingIcon, Send } from "lucide-react";
import { useState } from "react";

export default function DiscussionWindow({ UserData }: any) {
  console.log("UserData: DIccc", UserData);

  const [message, setMessage] = useState<string>("");
  const [chatmessages, setChatMessages] = useState([{}]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };
  const ws = useWebSocket();

  const handleSend = () => {
    ws.sendMessage(
      JSON.stringify({
        type: "message",
        content: message,
        receiver_id: UserData.id,
      }),
    );
    setChatMessages((prevMessages) => [
      ...prevMessages,
      {
        type: "message",
        content: message,
        receiver_id: 0,
        sender_id: "0", // Replace with the actual sender ID if available
        sender_name: "You", // Replace with the actual sender name if available
      },
    ]);
    setMessage("");
  };

  ws.receiveMessage((data) => {
    console.log("Received message:", data);
    if (data.type === "message") {
      setChatMessages((prevMessages) => [...prevMessages, data]);
      console.log("Updated chat messages:", chatmessages);
    }
  });
  return (
    <div className="flex flex-col flex-1">
      <div className="navebare flex items-center justify-start p-3.5 border-b border-slate-200/60 max-h-17.25">
        <div className="image">
          <img
            className="h-12 w-12 rounded-full object-cover"
            src={"http://localhost:8080" + UserData?.avatar}
            alt={UserData?.fullName || "User avatar"}
          />
        </div>

        <div className="info ml-3">
          <h3 className="text-[15px] font-bold">{UserData?.fullName}</h3>

          {UserData?.online ? (
            <div className="flex items-center gap-2">
              <span className="block h-2 w-2 rounded-full bg-green-600"></span>
              <p>online</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="block h-2 w-2 rounded-full bg-gray-500"></span>
              <p>offline</p>
            </div>
          )}
        </div>
      </div>
      <div className="chatwindow flex flex-col flex-1 justify-between">
        <div className="flex flex-col gap-3 p-4 overflow-y-auto max-h-[500px]">
          {chatmessages.map((msg, index) => {
            // Determine if the logged-in user is the sender
            const isMe = Number(msg.receiver_id) === UserData.id;
            console.log("isMe", isMe, "msg", msg, "UserData.id", UserData.id ,Number(msg.receiver_id) ,msg.receiver_id);

            return (
              <div
                key={index}
                className={`flex flex-col ${isMe ? "items-end" : "items-start ml-auto"}`}
              >
                {/* Author Label */}
                <span className="text-[12px] font-medium text-slate-500 mb-0.5 px-1">
                  {isMe ? "You" : msg.sender_name || "User"}
                </span>

                {/* Message Bubble */}
                <div
                  className={`p-3 max-w-[75%] rounded-2xl text-sm leading-relaxed shadow-sm break-words ${
                    isMe
                      ? "bg-blue-600 text-white rounded-br-xs"
                      : "bg-slate-100 text-slate-800 border border-slate-200/80 rounded-bl-xs"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex bg-white p-4">
          <div className="bg-[#F8FAFC] p-2.5 flex flex-col gap-1.5 rounded-2xl border border-slate-200/80 shadow-inner w-full">
            <div className="pb-1.5 flex text-[#9CA3AF] justify-start items-center gap-1.5 border-b  border-slate-200/60 ">
              <img
                className="w-9 h-9 placeholder-[#9CA3AF] object-cover rounded-full "
                src={"http://localhost:8080" + UserData.avatar}
                alt="heloo"
              />
              <input
                onChange={handleInputChange}
                className="outline-0 border-0 w-full p-1.5"
                type="text"
                placeholder="message..."
                value={message}
              />
              <FaceSlightlySmilingIcon />
            </div>
            <div
              onClick={handleSend}
              className="px-5  max-w-fit ml-auto text-[12px] py-2 bg-[#1A1A1A] hover:bg-black disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 shadow-md shadow-black/10 transition scale-100 active:scale-95 shrink-0"
            >
              <button>Send</button>
              <Send size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
