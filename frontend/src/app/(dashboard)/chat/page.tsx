"use server";

import { ChatWindow } from "@/src/components/chat/ChatWindow";

export default async function ChatPage() {
  return (
    <>
      <h1>Chat Page</h1>
      <div className="bg-red-600">
        <ChatWindow />
      </div>
    </>
  );
}
