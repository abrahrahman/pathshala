import React from 'react';
import { useAuth } from '../../lib/auth';
import { Bell, Search, Menu } from 'lucide-react';

interface HeaderProps {
  setSidebarOpen: (isOpen: boolean) => void;
}

export function Header({ setSidebarOpen }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="flex h-16 md:h-20 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 md:px-8 sticky top-0 z-10">
      <div className="flex flex-1 items-center gap-4">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 hidden sm:block">
          {user?.role} Dashboard
        </h2>
      </div>
      <div className="flex items-center space-x-3 md:space-x-6">
        <div className="hidden md:flex items-center px-3 py-2 bg-slate-100 rounded-lg text-slate-500 w-64 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
          <Search className="h-4 w-4 mr-2" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="bg-transparent border-none outline-none w-full text-sm text-slate-700 placeholder-slate-400"
          />
        </div>
        <button className="md:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
          <Search className="h-5 w-5" />
        </button>
        <button className="relative rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <span className="absolute right-2 top-2 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          </span>
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex items-center pl-3 md:pl-6 border-l border-slate-200">
          <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center text-blue-700 font-bold shadow-sm text-sm md:text-base">
            {user?.name.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}
