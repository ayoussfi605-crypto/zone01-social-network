import { redirect } from "next/navigation";
import FeedPage from "../components/feed/feed";
import GlobalSessionActions from "@/src/components/navigation/GlobalSessionActions";
import { checkSession } from "../utils/checkSession";

export default async function Feed() {
  const isLogin = await checkSession();
  console.log("is login");

  if (!isLogin) {
    redirect("/login");
  }

  return (
    <>
      <>
        <FeedPage />
        <GlobalSessionActions />
      </>
    </>
  );
}
