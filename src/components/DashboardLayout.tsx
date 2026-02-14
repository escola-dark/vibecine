import { ReactNode } from 'react';
import { Navbar } from './Navbar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen w-full">
      <Navbar />
      <main className="pt-16 md:pt-20 overflow-x-hidden">{children}</main>
    </div>
  );
}