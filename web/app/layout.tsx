// app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "SETTERS · Resource Dashboard",
  description: "Mock resource planning & forecasting dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
