/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Exam, ExamResult, Student, StudentStatus } from '../types';
import {
  Award,
  Plus,
  Calendar,
  Edit2,
  Trash2,
  Users,
  Search,
  ArrowLeft,
  Check,
  Save,
  BookOpen,
  Sparkles,
  TrendingUp,
  X,
  ClipboardList,
  Crown,
  Filter,
  ArrowRight,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export default function ExamPortalView() {
  const { students, exams, examResults, addExam, updateExam, deleteExam, saveExamResults, showToast } = useApp();

  // Navigation states
  const [activeView, setActiveView] = useState<'list' | 'entry' | 'stats'>('list');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Search & Filter states for Exam list
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Weekly' | 'Monthly'>('All');
  const [classFilter, setClassFilter] = useState<string>('All');

  // Exam Modal Form state
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examForm, setExamForm] = useState({
    name: '',
    type: 'Weekly' as 'Weekly' | 'Monthly',
    date: new Date().toISOString().split('T')[0],
    subject: '',
    totalMarks: 25,
    classLevel: 'Class 8',
  });

  // Marks Entry local state
  const [localMarks, setLocalMarks] = useState<Record<string, { marksObtained: string; isAbsent: boolean; remarks: string }>>({});
  const [marksSearch, setMarksSearch] = useState('');

  // Extract unique classes from active students for selection
  const activeStudents = useMemo(() => students.filter(s => s.status === StudentStatus.Active), [students]);
  const classLevelsList = useMemo(() => {
    const list = Array.from(new Set(students.map(s => s.classLevel))).filter(Boolean);
    return list.length > 0 ? list : ['Class 8', 'Class 9', 'Class 10', 'HSC 1st Year', 'HSC 2nd Year'];
  }, [students]);

  // Selected exam object
  const selectedExam = useMemo(() => {
    return exams.find(e => e.id === selectedExamId) || null;
  }, [exams, selectedExamId]);

  // Load local marks when entering marks view
  useEffect(() => {
    if (selectedExam) {
      const examResultsList = examResults.filter(r => r.examId === selectedExam.id);
      const mapping: Record<string, { marksObtained: string; isAbsent: boolean; remarks: string }> = {};

      // Filter active students of this exam's class
      const targetStudents = activeStudents.filter(s => s.classLevel === selectedExam.classLevel);
      
      targetStudents.forEach(student => {
        const saved = examResultsList.find(r => r.studentId === student.id);
        mapping[student.id] = {
          marksObtained: saved?.marksObtained !== undefined ? String(saved.marksObtained) : '',
          isAbsent: saved ? saved.isAbsent : false,
          remarks: saved?.remarks || '',
        };
      });

      setLocalMarks(mapping);
    }
  }, [selectedExam, examResults, activeStudents]);

  // Stats calculation
  const statsSummary = useMemo(() => {
    const totalExamsCount = exams.length;
    const weeklyCount = exams.filter(e => e.type === 'Weekly').length;
    const monthlyCount = exams.filter(e => e.type === 'Monthly').length;

    // Average mark % across all graded exams
    let totalObtained = 0;
    let totalMaxMarks = 0;
    let gradedCount = 0;

    examResults.forEach(res => {
      const exam = exams.find(e => e.id === res.examId);
      if (exam && !res.isAbsent && res.marksObtained !== undefined) {
        totalObtained += res.marksObtained;
        totalMaxMarks += exam.totalMarks;
        gradedCount++;
      }
    });

    const averageScorePercent = totalMaxMarks > 0 ? Math.round((totalObtained / totalMaxMarks) * 100) : 0;

    return {
      totalExamsCount,
      weeklyCount,
      monthlyCount,
      averageScorePercent,
      gradedCount
    };
  }, [exams, examResults]);

  // Filter exams list
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchesSearch = exam.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            exam.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'All' || exam.type === typeFilter;
      const matchesClass = classFilter === 'All' || exam.classLevel === classFilter;
      return matchesSearch && matchesType && matchesClass;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [exams, searchQuery, typeFilter, classFilter]);

  // Open Exam Modal for Create
  const handleOpenCreateModal = () => {
    setEditingExam(null);
    setExamForm({
      name: '',
      type: 'Weekly',
      date: new Date().toISOString().split('T')[0],
      subject: '',
      totalMarks: 25,
      classLevel: classLevelsList[0] || 'Class 8',
    });
    setIsExamModalOpen(true);
  };

  // Open Exam Modal for Edit
  const handleOpenEditModal = (exam: Exam, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingExam(exam);
    setExamForm({
      name: exam.name,
      type: exam.type,
      date: exam.date,
      subject: exam.subject,
      totalMarks: exam.totalMarks,
      classLevel: exam.classLevel,
    });
    setIsExamModalOpen(true);
  };

  // Handle Exam Form Submit
  const handleExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.name.trim() || !examForm.subject.trim()) {
      showToast('Please fill in all fields!', 'error');
      return;
    }

    if (examForm.totalMarks <= 0) {
      showToast('Total marks must be greater than 0!', 'error');
      return;
    }

    if (editingExam) {
      updateExam({
        ...editingExam,
        ...examForm,
      });
    } else {
      addExam(examForm);
    }
    setIsExamModalOpen(false);
  };

  // Delete Exam handler
  const handleDeleteExam = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this exam and all its marks?')) {
      deleteExam(id);
      if (selectedExamId === id) {
        setSelectedExamId(null);
        setActiveView('list');
      }
    }
  };

  // Enter Marks Workspace variables
  const entryStudentsList = useMemo(() => {
    if (!selectedExam) return [];
    return activeStudents
      .filter(s => s.classLevel === selectedExam.classLevel)
      .filter(s => {
        const query = marksSearch.toLowerCase();
        return s.name.toLowerCase().includes(query) || (s.roll !== undefined && String(s.roll).includes(query));
      })
      .sort((a, b) => (a.roll || 9999) - (b.roll || 9999));
  }, [selectedExam, activeStudents, marksSearch]);

  // Change individual student result locally
  const handleLocalMarkChange = (studentId: string, value: string) => {
    // Sanitization: Allow digits or decimals
    const sanitized = value.replace(/[^0-9.]/g, '');
    
    // Check upper limit constraint
    if (selectedExam && sanitized !== '') {
      const numValue = parseFloat(sanitized);
      if (numValue > selectedExam.totalMarks) {
        showToast(`Marks obtained cannot exceed total marks of ${selectedExam.totalMarks}!`, 'warning');
        return;
      }
    }

    setLocalMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marksObtained: sanitized,
      }
    }));
  };

  const handleLocalAbsentToggle = (studentId: string, checked: boolean) => {
    setLocalMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isAbsent: checked,
        marksObtained: checked ? '' : (prev[studentId]?.marksObtained || ''),
      }
    }));
  };

  const handleLocalRemarksChange = (studentId: string, remarks: string) => {
    setLocalMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: remarks,
      }
    }));
  };

  // Auto set full marks for testing/utility
  const handleMarkAllFull = () => {
    if (!selectedExam) return;
    const updated = { ...localMarks };
    entryStudentsList.forEach(s => {
      updated[s.id] = {
        ...updated[s.id],
        marksObtained: String(selectedExam.totalMarks),
        isAbsent: false,
      };
    });
    setLocalMarks(updated);
    showToast('Applied full marks to currently filtered students.');
  };

  // Clear all entered marks in entry form
  const handleClearAllEntry = () => {
    if (window.confirm('Clear all local entries on this form?')) {
      const updated = { ...localMarks };
      entryStudentsList.forEach(s => {
        updated[s.id] = {
          marksObtained: '',
          isAbsent: false,
          remarks: '',
        };
      });
      setLocalMarks(updated);
    }
  };

  // Save Entered Results
  const handleSaveResults = () => {
    if (!selectedExam) return;

    const resultsToSave: Omit<ExamResult, 'id'>[] = [];
    const targetStudents = activeStudents.filter(s => s.classLevel === selectedExam.classLevel);

    for (const student of targetStudents) {
      const entry = localMarks[student.id];
      if (entry) {
        const isAbsent = entry.isAbsent;
        const marksStr = entry.marksObtained;
        const marksNum = marksStr !== '' ? parseFloat(marksStr) : undefined;

        resultsToSave.push({
          examId: selectedExam.id,
          studentId: student.id,
          isAbsent,
          marksObtained: isAbsent ? undefined : marksNum,
          remarks: entry.remarks,
        });
      }
    }

    saveExamResults(selectedExam.id, resultsToSave);
    setActiveView('list');
  };

  // Selected Exam Analytics data
  const examAnalytics = useMemo(() => {
    if (!selectedExam) return null;

    const resultsForExam = examResults.filter(r => r.examId === selectedExam.id);
    const graded = resultsForExam.filter(r => !r.isAbsent && r.marksObtained !== undefined);
    const absentCount = resultsForExam.filter(r => r.isAbsent).length;
    const totalRegistered = activeStudents.filter(s => s.classLevel === selectedExam.classLevel).length;
    const gradedCount = graded.length;

    if (gradedCount === 0) {
      return {
        gradedCount: 0,
        absentCount,
        totalRegistered,
        average: 0,
        highest: 0,
        lowest: 0,
        passCount: 0,
        passPercentage: 0,
        rankList: [],
      };
    }

    const scores = graded.map(r => r.marksObtained as number);
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    const average = Math.round((sum / gradedCount) * 10) / 10;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);

    // Pass is defined as >= 40% of total marks
    const passThreshold = selectedExam.totalMarks * 0.4;
    const passCount = graded.filter(r => (r.marksObtained as number) >= passThreshold).length;
    const passPercentage = Math.round((passCount / gradedCount) * 100);

    // Create sorted rank list
    const rankList = graded
      .map(r => {
        const student = students.find(s => s.id === r.studentId);
        return {
          studentId: r.studentId,
          name: student?.name || 'Unknown Student',
          roll: student?.roll,
          marksObtained: r.marksObtained as number,
          percentage: Math.round(((r.marksObtained as number) / selectedExam.totalMarks) * 100),
          remarks: r.remarks,
        };
      })
      .sort((a, b) => b.marksObtained - a.marksObtained);

    return {
      gradedCount,
      absentCount,
      totalRegistered,
      average,
      highest,
      lowest,
      passCount,
      passPercentage,
      rankList,
    };
  }, [selectedExam, examResults, students, activeStudents]);

  // Count graded status for each exam in the list
  const getExamGradesStatus = (examId: string, classLevel: string) => {
    const resultsForExam = examResults.filter(r => r.examId === examId);
    const totalStudents = activeStudents.filter(s => s.classLevel === classLevel).length;
    const gradedCount = resultsForExam.length;
    
    return {
      gradedCount,
      totalStudents,
      isFullyGraded: gradedCount > 0 && gradedCount >= totalStudents,
    };
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-100 flex items-center gap-2">
            <Award className="w-7 h-7 text-amber-500" />
            Exam Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Store, monitor, and analyze Weekly and Monthly exam marks for each student.
          </p>
        </div>

        {activeView === 'list' && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 text-xs font-semibold text-slate-950 rounded-xl shadow-lg transition"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            Create Exam Portal
          </button>
        )}
      </div>

      {/* VIEW 1: EXAMS LIST & STATS DASHBOARD */}
      {activeView === 'list' && (
        <>
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                {statsSummary.totalExamsCount}
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Total Exams Held</span>
                <span className="text-lg font-bold text-slate-200">{statsSummary.totalExamsCount} Exams</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                {statsSummary.weeklyCount}
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Weekly Quizzes</span>
                <span className="text-lg font-bold text-slate-200">{statsSummary.weeklyCount} Assessments</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center font-bold">
                {statsSummary.monthlyCount}
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Monthly Exams</span>
                <span className="text-lg font-bold text-slate-200">{statsSummary.monthlyCount} Exams</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Average Score</span>
                <span className="text-lg font-bold text-slate-200">{statsSummary.averageScorePercent}% Rating</span>
              </div>
            </div>
          </div>

          {/* Search, Filter & List Card */}
          <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
              <h3 className="font-display font-semibold text-sm text-slate-200 flex items-center gap-1.5 self-start lg:self-center">
                <BookOpen className="w-4 h-4 text-slate-400" />
                Active Exam Portals ({filteredExams.length})
              </h3>

              {/* Filters bar */}
              <div className="w-full lg:w-auto flex flex-wrap items-center gap-2">
                {/* Search query */}
                <div className="relative flex-1 sm:flex-initial min-w-[180px]">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search exam, subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                  />
                </div>

                {/* Type Filter selector */}
                <div className="flex bg-slate-950/60 p-1 border border-slate-800 rounded-xl shrink-0">
                  {(['All', 'Weekly', 'Monthly'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`px-3 py-1 text-[10px] font-semibold rounded-lg transition ${
                        typeFilter === type
                          ? 'bg-slate-800 text-slate-200'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Class Filter dropdown */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Filter className="w-3 h-3 text-slate-500" />
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="bg-slate-950/60 border border-slate-800 rounded-xl text-[10px] font-semibold px-2 py-1.5 text-slate-300 focus:outline-none focus:border-slate-700"
                  >
                    <option value="All">All Classes</option>
                    {classLevelsList.map((cl) => (
                      <option key={cl} value={cl}>
                        {cl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Exams Grid list */}
            {filteredExams.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-xs text-slate-400 font-medium">No exam portal matched your query.</p>
                <p className="text-[10px] text-slate-500 mt-1">Create an exam portal to start tracking student scores.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredExams.map((exam) => {
                  const { gradedCount, totalStudents, isFullyGraded } = getExamGradesStatus(exam.id, exam.classLevel);

                  return (
                    <div
                      key={exam.id}
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setActiveView('stats');
                      }}
                      className="p-4 bg-slate-950/40 hover:bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl cursor-pointer transition group flex flex-col justify-between"
                    >
                      <div>
                        {/* Exam top status and meta */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase ${
                            exam.type === 'Weekly'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                          }`}>
                            {exam.type} Exam
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{exam.date}</span>
                        </div>

                        {/* Exam Title */}
                        <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition leading-snug">
                          {exam.name}
                        </h4>

                        {/* Details line */}
                        <div className="flex items-center gap-3 mt-2.5 text-[10px] text-slate-400">
                          <span className="bg-slate-900/60 px-2 py-1 border border-slate-800 rounded-md">
                            Subject: <strong className="text-slate-300">{exam.subject}</strong>
                          </span>
                          <span className="bg-slate-900/60 px-2 py-1 border border-slate-800 rounded-md">
                            Class: <strong className="text-slate-300">{exam.classLevel}</strong>
                          </span>
                          <span className="bg-slate-900/60 px-2 py-1 border border-slate-800 rounded-md">
                            Marks: <strong className="text-slate-300">{exam.totalMarks}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Grading and Actions footer */}
                      <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${isFullyGraded ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="text-[10px] font-medium text-slate-400">
                            {isFullyGraded ? 'Graded' : 'Grades Pending'} ({gradedCount}/{totalStudents} students)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleOpenEditModal(exam, e)}
                            className="p-1.5 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                            title="Edit Exam"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteExam(exam.id, e)}
                            className="p-1.5 bg-slate-900 text-rose-500/80 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition"
                            title="Delete Exam"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExamId(exam.id);
                              setActiveView('entry');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-bold transition ml-1"
                          >
                            Add Marks <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW 2: ADD/MANAGE MARKS WORKSPACE */}
      {activeView === 'entry' && selectedExam && (
        <div className="space-y-4">
          {/* Top navigation card */}
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView('list')}
                className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-bold text-slate-200">
                  Result Entry Workspace: {selectedExam.name}
                </h2>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                  <span>Type: <strong>{selectedExam.type}</strong></span>
                  <span>•</span>
                  <span>Class: <strong>{selectedExam.classLevel}</strong></span>
                  <span>•</span>
                  <span>Total Marks: <strong>{selectedExam.totalMarks}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllFull}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                Set All Full Marks
              </button>
              <button
                onClick={handleClearAllEntry}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 text-xs font-semibold rounded-xl transition"
              >
                Clear Form
              </button>
            </div>
          </div>

          {/* Core Table Grid for Student Results */}
          <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl">
            {/* Student list filters */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <span className="text-xs font-semibold text-slate-300">
                Eligible Class Students ({entryStudentsList.length})
              </span>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter student by roll or name..."
                  value={marksSearch}
                  onChange={(e) => setMarksSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Form grid / Table */}
            {entryStudentsList.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No active students found in {selectedExam.classLevel}.</p>
                <p className="text-[10px] text-slate-500 mt-1">Please add active students to this class in Students view first.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-500 uppercase">
                      <th className="py-3 px-4 w-16">Roll</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4 w-28 text-center">Absent</th>
                      <th className="py-3 px-4 w-40 text-center">Marks Obtained (Max: {selectedExam.totalMarks})</th>
                      <th className="py-3 px-4 text-left">Remarks / Teacher Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entryStudentsList.map((student) => {
                      const entry = localMarks[student.id] || { marksObtained: '', isAbsent: false, remarks: '' };

                      return (
                        <tr
                          key={student.id}
                          className={`border-b border-slate-900/60 hover:bg-slate-900/20 transition ${
                            entry.isAbsent ? 'opacity-50 bg-rose-950/5' : ''
                          }`}
                        >
                          {/* Roll */}
                          <td className="py-3 px-4 text-xs font-mono font-semibold text-slate-400">
                            {student.roll ?? 'N/A'}
                          </td>

                          {/* Student Name */}
                          <td className="py-3 px-4">
                            <p className="text-xs font-semibold text-slate-200">{student.name}</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-xs">{student.school}</p>
                          </td>

                          {/* Absent toggle */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={entry.isAbsent}
                              onChange={(e) => handleLocalAbsentToggle(student.id, e.target.checked)}
                              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                          </td>

                          {/* Marks Input */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="text"
                                placeholder={entry.isAbsent ? 'Absent' : '0'}
                                disabled={entry.isAbsent}
                                value={entry.marksObtained}
                                onChange={(e) => handleLocalMarkChange(student.id, e.target.value)}
                                className={`w-20 text-center px-2 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-slate-700 ${
                                  entry.isAbsent ? 'text-slate-700 border-slate-900 bg-slate-950/20' : 'text-amber-400'
                                }`}
                              />
                              <span className="text-[10px] text-slate-600">/ {selectedExam.totalMarks}</span>
                            </div>
                          </td>

                          {/* Remarks */}
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              placeholder="e.g. Good progress, Weak in Algebra"
                              value={entry.remarks}
                              onChange={(e) => handleLocalRemarksChange(student.id, e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-slate-800"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Actions footer */}
            {entryStudentsList.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-200 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveResults}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-98 text-xs font-semibold text-slate-950 rounded-xl shadow-md transition"
                >
                  <Save className="w-4 h-4 text-slate-950" />
                  Save Results
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: EXAM STATS & RANK LIST */}
      {activeView === 'stats' && selectedExam && examAnalytics && (
        <div className="space-y-4">
          {/* Header row */}
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView('list')}
                className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-[10px] bg-slate-800 border border-slate-700 text-amber-400 font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md">
                  {selectedExam.type} Exam Report
                </span>
                <h2 className="text-sm font-bold text-slate-200 mt-1">{selectedExam.name}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('entry')}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-98 text-xs font-bold text-slate-950 rounded-xl shadow-lg transition"
              >
                <Edit2 className="w-4 h-4 text-slate-950" />
                Modify Marks Entry
              </button>
            </div>
          </div>

          {/* Summary statistics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">Class Registered</span>
              <span className="text-base font-bold text-slate-200">{examAnalytics.totalRegistered} Students</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">Attended Exam</span>
              <span className="text-base font-bold text-slate-200">{examAnalytics.gradedCount} Students</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">Class Average</span>
              <span className="text-base font-bold text-slate-200">{examAnalytics.average} / {selectedExam.totalMarks}</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">Highest Score</span>
              <span className="text-base font-bold text-slate-200 text-emerald-400">{examAnalytics.highest} / {selectedExam.totalMarks}</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl col-span-2 md:col-span-1">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">Pass Percentage</span>
              <span className="text-base font-bold text-slate-200 text-sky-400">{examAnalytics.passPercentage}% Rate</span>
            </div>
          </div>

          {/* Rank list leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Col: Leaderboard list */}
            <div className="lg:col-span-2 p-5 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
              <h3 className="font-display font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-yellow-500" />
                Student Rank List ({examAnalytics.rankList.length} Graded)
              </h3>

              {examAnalytics.rankList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                  <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Results are not entered or graded yet.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Please select "Modify Marks Entry" above to add scores.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {examAnalytics.rankList.map((item, index) => {
                    const isTop3 = index < 3;
                    const badgeColors = 
                      index === 0 ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400' :
                      index === 1 ? 'bg-slate-300/15 border-slate-300/30 text-slate-300' :
                      index === 2 ? 'bg-amber-600/15 border-amber-600/30 text-amber-500' :
                      'bg-slate-900 text-slate-500 border-slate-800';

                    return (
                      <div
                        key={item.studentId}
                        className={`p-3 border rounded-2xl flex items-center justify-between gap-3 ${
                          isTop3 
                            ? 'bg-slate-950/80 border-slate-800' 
                            : 'bg-slate-950/30 border-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank badge */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border ${badgeColors}`}>
                            {isTop3 && <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500 animate-pulse" />}
                            #{index + 1}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5 truncate">
                              {item.name}
                              {isTop3 && <Crown className={`w-3.5 h-3.5 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : 'text-amber-600'}`} />}
                            </p>
                            <span className="text-[10px] text-slate-500 font-semibold">Roll: {item.roll ?? 'N/A'}</span>
                          </div>
                        </div>

                        {/* Marks Obtained */}
                        <div className="flex items-center gap-4 shrink-0">
                          {item.remarks && (
                            <span className="hidden sm:inline-block text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 max-w-[150px] truncate">
                              {item.remarks}
                            </span>
                          )}
                          <div className="text-right">
                            <p className="text-xs font-bold text-amber-400 font-mono">
                              {item.marksObtained} <span className="text-slate-600">/ {selectedExam.totalMarks}</span>
                            </p>
                            <span className="text-[10px] font-semibold text-slate-500 block font-mono">{item.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Col: Distributions & General Stats */}
            <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4 h-fit">
              <h3 className="font-display font-semibold text-xs text-slate-200">
                Grade Breakdown
              </h3>

              {examAnalytics.gradedCount === 0 ? (
                <p className="text-[10px] text-slate-500 italic">No breakdown available.</p>
              ) : (
                <div className="space-y-4">
                  {/* Grade ranges calculations */}
                  {[
                    { label: 'Excellent (80%-100%)', count: examAnalytics.rankList.filter(r => r.percentage >= 80).length, color: 'bg-emerald-500' },
                    { label: 'Satisfactory (60%-79%)', count: examAnalytics.rankList.filter(r => r.percentage >= 60 && r.percentage < 80).length, color: 'bg-sky-500' },
                    { label: 'Passing (40%-59%)', count: examAnalytics.rankList.filter(r => r.percentage >= 40 && r.percentage < 60).length, color: 'bg-amber-500' },
                    { label: 'Needs Help (<40%)', count: examAnalytics.rankList.filter(r => r.percentage < 40).length, color: 'bg-rose-500' },
                  ].map((range) => {
                    const percent = Math.round((range.count / examAnalytics.gradedCount) * 100);

                    return (
                      <div key={range.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                          <span>{range.label}</span>
                          <span>{range.count} {range.count === 1 ? 'student' : 'students'} ({percent}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div className={`h-full ${range.color}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}

                  <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-[11px] leading-relaxed text-slate-400">
                    <p className="font-bold text-slate-300 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      Class Analysis Report
                    </p>
                    Of the {examAnalytics.totalRegistered} students registered in {selectedExam.classLevel}, {examAnalytics.gradedCount} attended this exam on {selectedExam.date}. The highest score recorded is <strong className="text-emerald-400 font-mono">{examAnalytics.highest}</strong> out of {selectedExam.totalMarks}. The overall pass rate is <strong className="text-sky-400">{examAnalytics.passPercentage}%</strong>.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EXAM CONFIGURATION DIALOG / MODAL */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsExamModalOpen(false)}
              className="absolute right-4 top-4 p-1 bg-slate-950 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-display font-bold text-slate-100 text-sm mb-4">
              {editingExam ? 'Edit Exam Details' : 'Create New Exam Portal'}
            </h3>

            <form onSubmit={handleExamSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Exam Name</label>
                <input
                  type="text"
                  placeholder="e.g. Class 8 Monthly Algebra Exam"
                  value={examForm.name}
                  onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Exam Type</label>
                  <select
                    value={examForm.type}
                    onChange={(e) => setExamForm({ ...examForm, type: e.target.value as 'Weekly' | 'Monthly' })}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>

                {/* Class */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Target Class</label>
                  <select
                    value={examForm.classLevel}
                    onChange={(e) => setExamForm({ ...examForm, classLevel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                  >
                    {classLevelsList.map(cl => (
                      <option key={cl} value={cl}>{cl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Subject / Chapter</label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics"
                    value={examForm.subject}
                    onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
                    required
                  />
                </div>

                {/* Total Marks */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Total Marks</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={examForm.totalMarks}
                    onChange={(e) => setExamForm({ ...examForm, totalMarks: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Exam Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={examForm.date}
                    onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition"
                >
                  {editingExam ? 'Save Changes' : 'Create Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
