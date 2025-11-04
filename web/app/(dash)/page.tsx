"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const Dashboard = dynamic(
  () => import("@/components/SettersResourceDashboardMock"),
  { 
    ssr: false,
    loading: () => <div>Loading dashboard...</div>
  }
);

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}