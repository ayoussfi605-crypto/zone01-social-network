import Link from "next/link";
import LoginForm from "../../../components/auth/LoginForm";
import { checkSession } from "@/src/utils/checkSession";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const isLogin = await checkSession();
  console.log("is login");

  if (isLogin) {
    redirect("/");
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white">
        <div className="bg-black px-8 pb-6 pt-8 text-white">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C4B5FD] text-2xl">
            💬
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-indigo-100">
            Log in to your social-network network
          </p>
        </div>
        <div className="px-8 py-8">
          <LoginForm />
          <p className="mt-4 text-center text-sm text-zinc-500">
            No account?{" "}
            <Link
              href="/register"
              className="font-semibold text-indigo-600 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
