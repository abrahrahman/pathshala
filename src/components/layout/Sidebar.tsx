import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Settings, 
  Printer, 
  Factory, 
  FileText, 
  LogOut,
  X,
  Globe,
  Briefcase,
  Wallet
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const links = {
    Admin: [
      { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      { name: 'Orders', path: '/admin/orders', icon: ShoppingCart },
      { name: 'Clients', path: '/admin/clients', icon: Users },
      { name: 'Domains', path: '/admin/domains', icon: Globe },
      { name: 'Services', path: '/admin/services', icon: Briefcase },
      { name: 'Accounts', path: '/admin/accounts', icon: Wallet },
      { name: 'Users', path: '/admin/users', icon: Users },
      { name: 'Settings', path: '/admin/settings', icon: Settings },
    ],
    Printing: [
      { name: 'Dashboard', path: '/printing', icon: LayoutDashboard },
      { name: 'My Orders', path: '/printing/orders', icon: Printer },
    ],
    Factory: [
      { name: 'Dashboard', path: '/factory', icon: LayoutDashboard },
      { name: 'QC & Dispatch', path: '/factory/orders', icon: Factory },
    ],
    Client: [
      { name: 'Dashboard', path: '/client', icon: LayoutDashboard },
      { name: 'My Orders', path: '/client/orders', icon: FileText },
    ]
  };

  const currentLinks = links[user.role] || [];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 flex h-full w-72 flex-col bg-slate-900 text-white shadow-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-20 items-center justify-between px-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Printer className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">ID Print SaaS</h1>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className="mb-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Main Menu
          </div>
          <nav className="space-y-1">
            {currentLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )
                }
              >
                <link.icon 
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  )} 
                  aria-hidden="true" 
                />
                {link.name}
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-800/50">
          <div className="rounded-2xl bg-slate-800/50 p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold shadow-inner">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-red-500 hover:text-white transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
