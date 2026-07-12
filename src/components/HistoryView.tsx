/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { History, Search, Calendar, RefreshCw, X } from 'lucide-react';

export default function HistoryView() {
  const { activities, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');

  const filteredLogs = activities.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  const getModuleOptions = () => {
    const modules = Array.from(new Set(activities.map((a) => a.module)));
    return ['All', ...modules];
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 select-none">
      {/* Title Header */}
      <div>
        <h2 className="text-xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          Administrative Activity History
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">
          Chronological audits of student additions, weekly attendances, compiled files, and settings.
        </p>
      </div>

      {/* Audit filter bars */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 bg-slate-900/40 border border-slate-800 rounded-xl">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search action keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 outline-none placeholder-slate-500 transition"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-1.5 outline-none"
          >
            {getModuleOptions().map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearch('');
              setModuleFilter('All');
              showToast('Filters cleared', 'info');
            }}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 rounded-lg"
            title="Reset Search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chronological Vertical Stream */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
          {filteredLogs.map((log) => {
            return (
              <div key={log.id} className="flex gap-4 relative group">
                {/* Visual marker dot */}
                <div className={`w-[23px] h-[23px] rounded-full flex items-center justify-center shrink-0 border z-10 transition-colors ${
                  log.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  log.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  log.type === 'danger' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                  'bg-slate-800 border-slate-700 text-slate-300'
                }`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                </div>

                <div className="min-w-0 flex-1 p-3 bg-slate-900/40 border border-slate-850 rounded-xl hover:border-slate-800 transition">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-slate-500">
                      {log.module}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-200 mt-1">{log.action}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{log.details}</p>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              No administrative logs match your filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
