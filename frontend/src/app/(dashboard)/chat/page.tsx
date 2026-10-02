import ChatWindow from "@/src/components/chat/ChatWindow";
import { ChatService } from "@/src/services/chatService";

export default async function ChatPage() {
  const res = await ChatService.getChatUserList();

  console.log(res, "dddd");

  return (
    <>
      <div>
        <ChatWindow />
      </div>
    </>
  );
}
