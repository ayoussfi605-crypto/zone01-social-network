import ChatWindow from "@/src/components/chat/ChatWindow";
import { ChatService } from "@/src/services/chatService";
import { ChatUsers } from "@/src/types/chat";
import { checkSession } from "@/src/utils/checkSession";
import { redirect } from "next/navigation";

export default async function ChatPage() {
  const isLogin = await checkSession();
  if (!isLogin) {
    redirect("/login");
  }
  const response = await ChatService.getChatUserList();
  const users: ChatUsers[] = Array.isArray(response.data) ? response.data : [];

  return (
    <>
      <div>
        <ChatWindow users={users} />
      </div>
    </>
  );
}
