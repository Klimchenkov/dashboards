"use client";

import dynamic from "next/dynamic";
const Dashboard = dynamic(() => import("@/components/SettersResourceDashboardMock"), { ssr: false });

export default function Page() {
  return <Dashboard />;
}
