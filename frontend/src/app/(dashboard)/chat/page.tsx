import ChatWindow from "@/src/components/chat/ChatWindow";
import { ChatService } from "@/src/services/chatService";
import { checkSession } from "@/src/utils/checkSession";
import { redirect } from "next/navigation";

export default async function ChatPage() {
  const isLogin = await checkSession();
  if (!isLogin) {
    redirect("/");
  }
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
