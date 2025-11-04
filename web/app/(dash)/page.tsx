"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const Dashboard = dynamic(
  () => import("@/components/SettersResourceDashboardMock"),
  { 
    ssr: false,
    loading: () => <div>Загружаем дэшборд...</div>
  }
);

export default function Page() {
  return (
    <Suspense fallback={<div>Загружаем...</div>}>
      <Dashboard />
    </Suspense>
  );
}