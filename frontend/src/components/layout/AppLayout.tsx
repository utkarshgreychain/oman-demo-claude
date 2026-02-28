import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { NavRail } from './NavRail';
import { pageTransition } from '../../utils/animations';

export function AppLayout() {
  const location = useLocation();
  const showSidebar = location.pathname === '/home';

  return (
    <div className="flex h-screen">
      <NavRail />
      {showSidebar && <Sidebar />}
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              {...pageTransition}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
