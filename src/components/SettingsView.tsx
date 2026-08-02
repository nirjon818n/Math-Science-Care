/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Save, RefreshCw, Download, Upload, Trash2, ShieldAlert, GraduationCap } from 'lucide-react';
import { StorageManager } from '../lib/storage';

export default function SettingsView() {
  const { settings, updateSettings, resetAllData, showToast } = useApp();

  const [instituteName, setInstituteName] = useState(settings.instituteName);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [themeAccent, setThemeAccent] = useState(settings.themeAccent);
  const [darkMode, setDarkMode] = useState(settings.darkMode);
  const [customFooterText, setCustomFooterText] = useState(settings.customFooterText);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      instituteName,
      logoUrl,
      themeAccent,
      darkMode,
      customFooterText,
    });
  };

  const handleBackupExport = () => {
    const backupJson = StorageManager.exportDatabase();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tuition_care_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('Database JSON backup successfully downloaded!');
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const success = StorageManager.importDatabase(text);
      if (success) {
        showToast('Database imported successfully! Page will now refresh.', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast('Failed to import backup. Please verify file integrity.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = () => {
    if (confirm('CRITICAL WARING: This will erase all student data, attendance logs, and question documents permanently. Proceed with factory reset?')) {
      resetAllData();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 select-none">
      {/* Title Header */}
      <div>
        <h2 className="text-xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          Portal Configurations & Backups
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">
          Customize institute labels, accent colors, export standard JSON copies, or restore databases.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings Form Column (2 cols) */}
        <div className="md:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="flex flex-col space-y-1">
              <label className="text-slate-400 font-semibold">Institute Name</label>
              <input
                type="text"
                value={instituteName}
                onChange={(e) => setInstituteName(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-100"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-slate-400 font-semibold">Institute Logo Avatar URL</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-100 flex-1"
                />
                <div className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center">
                  {(logoUrl && logoUrl !== '/app_logo.jpg' && !logoUrl.includes('unsplash.com')) ? (
                    <img 
                      src={logoUrl} 
                      alt="Logo Preview" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <GraduationCap className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-slate-400 font-semibold">Theme Accent Color</label>
                <select
                  value={themeAccent}
                  onChange={(e) => setThemeAccent(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-100"
                >
                  <option value="emerald">Emerald Green</option>
                  <option value="indigo">Indigo Blue</option>
                  <option value="violet">Violet Purple</option>
                  <option value="amber">Amber Gold</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-slate-400 font-semibold">Display Theme</label>
                <select
                  value={darkMode ? 'dark' : 'light'}
                  onChange={(e) => setDarkMode(e.target.value === 'dark')}
                  className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-100"
                >
                  <option value="dark">Widescreen Dark (Recommended)</option>
                  <option value="light">Crisp Light</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-slate-400 font-semibold">Custom Print Footer Text</label>
              <input
                type="text"
                value={customFooterText}
                onChange={(e) => setCustomFooterText(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-100"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                <Save className="w-4 h-4" /> Save Configurations
              </button>
            </div>
          </form>
        </div>

        {/* Backups & Resets (1 col) */}
        <div className="space-y-6">
          {/* JSON Backups Card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block font-mono">
              Database Sync & Backups
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Export a standalone JSON file copy of your entire local database to prevent data loss due to cleared browser cache.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleBackupExport}
                className="flex items-center justify-center gap-1.5 p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl font-bold text-slate-300"
              >
                <Download className="w-4 h-4" /> Download Backup (.json)
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl font-bold text-slate-300"
              >
                <Upload className="w-4 h-4" /> Restore Backup (.json)
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleBackupImport}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 space-y-3 text-xs">
            <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider block font-mono flex items-center gap-1">
              <ShieldAlert className="w-4 h-4" /> Danger Zone
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Erase all client database stores and restore system original demonstrations.
            </p>

            <button
              onClick={handleFactoryReset}
              className="w-full flex items-center justify-center gap-1.5 p-2 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold rounded-xl"
            >
              <Trash2 className="w-4 h-4" /> Factory Reset Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
