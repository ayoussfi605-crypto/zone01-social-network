import { WsProdider } from "@/src/context/WebSocketConetext";
import GlobalSessionActions from "@/src/components/navigation/GlobalSessionActions";
import DashboardSidebar from "@/src/components/navigation/DashboardSidebar";
import MobileBottomNav from "@/src/components/navigation/MobileBottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WsProdider>
      <div className="min-h-screen bg-white md:grid md:grid-cols-[220px_minmax(0,1fr)]">
        <DashboardSidebar />
        <div className="min-w-0">{children}</div>
      </div>
      <MobileBottomNav />
      <GlobalSessionActions />
    </WsProdider>
  );
}
