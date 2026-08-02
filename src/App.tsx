/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import StudentView from './components/StudentView';
import AttendanceView from './components/AttendanceView';
import QuestionBankView from './components/QuestionBankView';
import DocumentManagerView from './components/DocumentManagerView';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import ExamPortalView from './components/ExamPortalView';
import TuitionFeeTrackerView from './components/TuitionFeeTrackerView';
import SmsDashboard from './components/SmsDashboard';
import GlobalSearch from './components/GlobalSearch';
import DhakaClock from './components/DhakaClock';
import AdminLogin from './components/AdminLogin';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

function AppContent() {
  const { currentSection, toasts, removeToast, adminPassword, setAdminPassword } = useApp();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (adminPassword !== '2010636075') {
    return <AdminLogin onLoginSuccess={setAdminPassword} />;
  }

  // Render correct active tab layout
  const renderSection = () => {
    switch (currentSection) {
      case 'Dashboard':
        return <DashboardView />;
      case 'Students':
        return <StudentView />;
      case 'Attendance':
        return <AttendanceView />;
      case 'Exam Portal':
        return <ExamPortalView />;
      case 'Question Bank':
        return <QuestionBankView />;
      case 'Tuition Fee Tracker':
        return <TuitionFeeTrackerView />;
      case 'Document Manager':
        return <DocumentManagerView />;
      case 'SMS Dashboard':
        return <SmsDashboard />;
      case 'Activity History':
        return <HistoryView />;
      case 'Settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Collapsible sidebar */}
      <Sidebar onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Main viewport area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative pt-14 lg:pt-0">
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 lg:py-8 z-10">
          {/* Dhaka Live Clock - positioned at the top-right of the scrolling area, pushing content down naturally */}
          <div className="flex justify-end mb-5 select-none shrink-0">
            <DhakaClock />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global Command-K Search Overlay */}
        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </div>

      {/* Dynamic Toast Messages Stack */}
      <div className="fixed bottom-4 left-4 space-y-2 z-50 max-w-sm w-full select-none">
        <AnimatePresence>
          {toasts.map((t) => {
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.9 }}
                className="p-3 rounded-xl border flex items-center justify-between gap-3 shadow-2xl bg-slate-900 border-slate-800 text-slate-200"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {t.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {t.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
                  {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                  {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span className="text-xs font-semibold truncate leading-none">{t.message}</span>
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-slate-500 hover:text-slate-300 text-xs font-bold leading-none shrink-0"
                >
                  ×
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
