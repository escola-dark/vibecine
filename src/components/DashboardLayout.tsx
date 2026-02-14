import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { DashboardSidebar } from './DashboardSidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen w-full">
      <Navbar />
      <DashboardSidebar />
      <main className="pt-16 md:pt-20 lg:pl-[240px] overflow-x-hidden">{children}</main>
    </div>
  );
}