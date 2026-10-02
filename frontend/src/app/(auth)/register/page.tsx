import Link from "next/link";
import RegisterForm from "../../../components/auth/RegisterForm";
import { checkSession } from "@/src/utils/checkSession";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const isLogin = await checkSession();
  if (isLogin) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-linear-to-r from-indigo-600 to-violet-600 px-8 pb-6 pt-8 text-white">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
            ✨
          </div>
          <h1 className="text-2xl font-bold">Join the network</h1>
          <p className="text-sm text-indigo-100">
            Create your account in seconds
          </p>
        </div>
        <div className="px-8 py-8">
          <RegisterForm />
          <p className="mt-4 text-center text-sm text-zinc-500">
            Have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-indigo-600 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
