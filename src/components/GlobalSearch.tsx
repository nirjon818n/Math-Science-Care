/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Search, X, Users, FileText, FolderOpen, Presentation, Calendar, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent?: (id: string) => void;
  onSelectDocument?: (id: string) => void;
  onSelectQuestion?: (id: string) => void;
  onSelectPresentation?: (id: string) => void;
}

export default function GlobalSearch({
  isOpen,
  onClose,
  onSelectStudent,
  onSelectDocument,
  onSelectQuestion,
  onSelectPresentation,
}: GlobalSearchProps) {
  const { students, documents, questions, presentations, setCurrentSection } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggling
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Search filter
  const cleanQuery = query.toLowerCase().trim();

  const matchedStudents = cleanQuery
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(cleanQuery) ||
          s.school.toLowerCase().includes(cleanQuery) ||
          s.classLevel.toLowerCase().includes(cleanQuery) ||
          s.roll.toString() === cleanQuery
      )
    : [];

  const matchedDocs = cleanQuery
    ? documents.filter(
        (d) =>
          d.title.toLowerCase().includes(cleanQuery) ||
          d.content.toLowerCase().includes(cleanQuery)
      )
    : [];

  const matchedQuestions = cleanQuery
    ? questions.filter(
        (q) =>
          q.title.toLowerCase().includes(cleanQuery) ||
          q.chapter.toLowerCase().includes(cleanQuery) ||
          q.content.toLowerCase().includes(cleanQuery) ||
          q.tags.some((t) => t.toLowerCase().includes(cleanQuery))
      )
    : [];

  const matchedSlides = cleanQuery
    ? presentations.filter(
        (p) =>
          p.title.toLowerCase().includes(cleanQuery) ||
          p.slides.some(
            (s) =>
              s.title.toLowerCase().includes(cleanQuery) ||
              s.notes.toLowerCase().includes(cleanQuery)
          )
      )
    : [];

  const hasResults =
    matchedStudents.length > 0 ||
    matchedQuestions.length > 0 ||
    matchedSlides.length > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-start justify-center pt-[10vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        >
          {/* Input Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search students, papers, docs, or slide decks... (ESC to close)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-slate-100 outline-none placeholder-slate-500 text-sm py-1"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results Area */}
          <div className="overflow-y-auto flex-1 p-3 space-y-4">
            {!cleanQuery && (
              <div className="py-6 text-center">
                <p className="text-slate-400 text-sm">Type to begin searching the admin console.</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => {
                      setCurrentSection('Students');
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 border border-slate-700/40 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                  >
                    <Users className="w-3.5 h-3.5" /> View Spreadsheet
                  </button>
                  <button
                    onClick={() => {
                      setCurrentSection('Attendance');
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 border border-slate-700/40 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Log Attendance
                  </button>
                </div>
              </div>
            )}

            {cleanQuery && !hasResults && (
              <div className="py-8 text-center text-slate-500 text-sm">
                No matching records found for "{query}".
              </div>
            )}

            {cleanQuery && hasResults && (
              <div className="space-y-4">
                {/* Students Matches */}
                {matchedStudents.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-mono text-slate-500 uppercase tracking-wider px-2 mb-1">
                      Students ({matchedStudents.length})
                    </h3>
                    <div className="space-y-0.5">
                      {matchedStudents.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setCurrentSection('Students');
                            if (onSelectStudent) onSelectStudent(s.id);
                            onClose();
                          }}
                          className="w-full text-left flex items-center justify-between px-2 py-2 hover:bg-slate-800/50 rounded-lg transition group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md flex items-center justify-center text-xs font-bold shrink-0">
                              R{s.roll}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-200 truncate group-hover:text-emerald-400 transition">
                                {s.name}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {s.classLevel} • {s.school}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question Matches */}
                {matchedQuestions.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-mono text-slate-500 uppercase tracking-wider px-2 mb-1">
                      Questions ({matchedQuestions.length})
                    </h3>
                    <div className="space-y-0.5">
                      {matchedQuestions.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => {
                            setCurrentSection('Question Bank');
                            if (onSelectQuestion) onSelectQuestion(q.id);
                            onClose();
                          }}
                          className="w-full text-left flex items-center justify-between px-2 py-2 hover:bg-slate-800/50 rounded-lg transition group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md flex items-center justify-center shrink-0">
                              <FolderOpen className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-200 truncate group-hover:text-indigo-400 transition">
                                {q.title}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {q.subject} • {q.chapter} • {q.classLevel}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Slides Matches */}
                {matchedSlides.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-mono text-slate-500 uppercase tracking-wider px-2 mb-1">
                      Slides ({matchedSlides.length})
                    </h3>
                    <div className="space-y-0.5">
                      {matchedSlides.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setCurrentSection('Slide Builder');
                            if (onSelectPresentation) onSelectPresentation(p.id);
                            onClose();
                          }}
                          className="w-full text-left flex items-center justify-between px-2 py-2 hover:bg-slate-800/50 rounded-lg transition group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md flex items-center justify-center shrink-0">
                              <Presentation className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-200 truncate group-hover:text-amber-400 transition">
                                {p.title}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {p.slides.length} slides • Edited {new Date(p.lastEdited).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Select with click • ESC to cancel</span>
            <div className="flex items-center gap-1">
              <span>Shortcuts:</span>
              <span className="kbd-btn">⌘K</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
