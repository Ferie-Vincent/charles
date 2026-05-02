import { useState } from 'react';
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import OfflineBanner from '../ui/OfflineBanner';

export default function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);

  return (
    <>
      <OfflineBanner />
      <div className={`app-shell${sidebarOpen ? '' : ' app-shell--sidebar-collapsed'}`}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}
        <div className="app-content">
          <Topbar onMenuToggle={() => setSidebarOpen(o => !o)} />
          <main className="page-content">{children}</main>
        </div>
      </div>
      <MobileBottomNav />
    </>
  );
}
