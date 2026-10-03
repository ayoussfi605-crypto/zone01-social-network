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
  const res: any = await ChatService.getChatUserList();

  if (!res.success) {
    //banner
    console.log(res?.data);
  }
  console.log("res ,", res?.data);

  const users: ChatUsers[] = res?.data ? res.data : [];

  console.log(users, "dddd");

  return (
    <>
      <div>
        <ChatWindow users={users} />
      </div>
    </>
  );
}
