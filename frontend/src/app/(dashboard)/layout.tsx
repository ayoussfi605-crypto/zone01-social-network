import { WsProdider } from "@/src/context/WebSocketConetext";
import GlobalSessionActions from "@/src/components/navigation/GlobalSessionActions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WsProdider>
      {children}
      <GlobalSessionActions />
    </WsProdider>
  );
}
