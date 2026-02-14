import { ReactNode } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { useContent } from '@/contexts/ContentContext';

interface DashboardLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export function DashboardLayout({ children, fullWidth }: DashboardLayoutProps) {
  const { catalog } = useContent();

  if (!catalog.isLoaded) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full">
      <DashboardSidebar />
      <main className="flex-1 ml-[68px] lg:ml-[240px] transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
