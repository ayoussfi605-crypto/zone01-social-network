import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { WsProdider } from "../context/WebSocketConetext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sphere — social-network Network",
  description: "Followers, posts, groups, chat and notifications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.className}  h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <WsProdider>{children}</WsProdider>
      </body>
    </html>
  );
}
