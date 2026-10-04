import { WsProdider } from "@/src/context/WebSocketConetext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WsProdider>{children}</WsProdider>;
}
