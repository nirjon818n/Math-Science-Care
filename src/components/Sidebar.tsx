/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FolderOpen,
  FileText,
  Presentation,
  Search,
  History,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  onOpenSearch: () => void;
}

export default function Sidebar({ onOpenSearch }: SidebarProps) {
  const { currentSection, setCurrentSection, settings, logout } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Students', icon: Users },
    { name: 'Attendance', icon: CheckSquare },
    { name: 'Exam Portal', icon: Award },
    { name: 'Question Bank', icon: FolderOpen },
    { name: 'Slide Builder', icon: Presentation },
    { name: 'Search', icon: Search, onClick: onOpenSearch },
    { name: 'Activity History', icon: History },
    { name: 'Settings', icon: Settings },
  ];

  const getAccentColor = () => {
    switch (settings.themeAccent) {
      case 'emerald': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'indigo': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'violet': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'amber': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const getActiveItemStyle = () => {
    switch (settings.themeAccent) {
      case 'emerald': return 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500';
      case 'indigo': return 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500';
      case 'violet': return 'bg-violet-500/10 text-violet-400 border-l-2 border-violet-500';
      case 'amber': return 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500';
      default: return 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500';
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between py-4 select-none">
      {/* Brand Header */}
      <div>
        <div className={`flex items-center gap-3 px-4 mb-8 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="relative">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700/60 flex items-center justify-center shadow-lg`}>
              <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse-slow" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-slate-950"></div>
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <h1 className="font-display font-bold text-slate-100 text-[15px] tracking-tight whitespace-nowrap">
                {settings.instituteName}
              </h1>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                Admin Console
              </span>
            </motion.div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.name;

            return (
              <button
                key={item.name}
                id={`sidebar-item-${item.name.toLowerCase().replace(' ', '-')}`}
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                  } else {
                    setCurrentSection(item.name);
                    setMobileOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group text-left ${
                  isActive
                    ? getActiveItemStyle()
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? '' : 'text-slate-400 group-hover:text-slate-200'}`} />
                {!isCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
                {!isCollapsed && item.name === 'Search' && (
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-500">
                    ⌘K
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="px-3">
        {!isCollapsed ? (
          <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"
                alt="Admin Avatar"
                className="w-8 h-8 rounded-full border border-slate-700/60 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-200 truncate">Nion Hassan Nirjon</span>
                <span className="text-[10px] text-slate-500 truncate">Senior Admin</span>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Log out"
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => logout()}
            title="Log out"
            className="flex justify-center w-full p-2 hover:bg-slate-850 border border-transparent hover:border-slate-800 rounded-xl transition-all relative group cursor-pointer"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"
              alt="Admin Avatar"
              className="w-8 h-8 rounded-full border border-slate-700/60 object-cover group-hover:opacity-20 transition-opacity"
              referrerPolicy="no-referrer"
            />
            <LogOut className="w-4 h-4 text-rose-400 absolute opacity-0 group-hover:opacity-100 transition-opacity self-center" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden h-14 bg-slate-900/80 backdrop-blur border-b border-slate-800/60 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="font-display font-bold text-slate-100 text-sm tracking-tight">
            {settings.instituteName}
          </span>
        </div>
        <button
          id="mobile-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 text-slate-400 hover:text-slate-100 focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Overlay Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black z-40"
            ></motion.div>
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 bottom-0 left-0 w-64 bg-slate-900 border-r border-slate-800/80 z-50 flex flex-col h-full"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.div
        animate={{ width: isCollapsed ? 72 : 240 }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        className="hidden lg:flex flex-col h-screen shrink-0 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/60 relative z-20"
      >
        {sidebarContent}

        {/* Collapse Button */}
        <button
          id="sidebar-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-5 -right-3 w-6 h-6 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 rounded-full flex items-center justify-center shadow cursor-pointer transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </motion.div>
    </>
  );
}
