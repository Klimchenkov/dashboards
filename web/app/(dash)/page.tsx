"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const Dashboard = dynamic(
  () => import("@/components/SettersResourceDashboard"),
  { 
    ssr: false,
    loading: () => <div>Загружаем дэшборд...</div>
  }
);

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
        setIsAuthenticated(true);
        return;
      }

      const userId = localStorage.getItem('userId');
      const userData = localStorage.getItem('userData');
      
      if (userId && userData) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.push('/auth');
      }
    };

    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Проверка аутентификации...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to /auth
  }

  return (
    <Suspense fallback={<div>Загружаем...</div>}>
      <Dashboard />
    </Suspense>
  );
}