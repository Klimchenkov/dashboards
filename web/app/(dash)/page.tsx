"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkAuth = async () => {
      // Check for URL parameter authentication first
      const from = searchParams.get('from');
      const userId = searchParams.get('user_id');
      const code = searchParams.get('code');

      if (from === 'setters_system' && userId && code) {
        console.log('Attempting URL parameter authentication');
        try {
          const response = await fetch('/api/auth/verify-url-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              user_id: userId,
              code: code 
            }),
          });

          const data = await response.json();

          if (response.ok && data.userData) {
            // Save user data to localStorage
            localStorage.setItem('userId', data.userData.id.toString());
            localStorage.setItem('userData', JSON.stringify(data.userData));
            setIsAuthenticated(true);
            console.log('URL parameter authentication successful');
            return;
          } else {
            console.log('URL parameter authentication failed:', data.error);
            router.push('/auth');
          }
        } catch (error) {
          console.error('URL parameter auth error:', error);
          // Fall back to normal authentication check
        }
      }

      // Existing authentication check
      if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
        setIsAuthenticated(true);
        return;
      }

      const storedUserId = localStorage.getItem('userId');
      const userData = localStorage.getItem('userData');
      
      if (storedUserId && userData) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.push('/auth');
      }
    };

    checkAuth();
  }, [router, searchParams]);

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