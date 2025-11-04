import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes } from "react";
import { clsx } from "clsx";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={clsx("px-3 py-2 rounded-2xl shadow-soft bg-primary text-white hover:opacity-90 transition", className)} />;
}

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("card p-4", className)} {...props}>{children}</div>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx("border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary", className)} />;
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string, label: ReactNode }[], active: string, onChange: (k: string)=>void }) {
  return (
    <div className="flex gap-2">
      {tabs.map(t => (
        <button key={t.key} onClick={()=>onChange(t.key)} className={clsx("px-3 py-2 rounded-2xl", active===t.key ? "bg-neutral-900 text-white" : "bg-neutral-100 hover:bg-neutral-200")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
