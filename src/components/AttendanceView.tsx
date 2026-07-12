/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AttendanceStatus, StudentStatus, AttendanceRecord } from '../types';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  Save,
  Check,
  Award,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  ArrowLeft,
  Users,
  Lock
} from 'lucide-react';

export default function AttendanceView() {
  const { students, attendance, saveAttendanceRecords, showToast } = useApp();

  const getTodayStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [activeTab, setActiveTab] = useState<'take' | 'history'>('take');
  
  // State for batch-wise selection (by time slot)
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  // Local state for taking attendance: studentId -> status (only used for pending changes before submit)
  const [localRecords, setLocalRecords] = useState<Record<string, AttendanceStatus>>({});

  const activeStudents = students.filter((s) => s.status === StudentStatus.Active);

  // Group active students by batchTime (defaulting to 'Flexible Hours' if empty)
  const uniqueBatches = Array.from(new Set(activeStudents.map((s) => s.batchTime || 'Flexible Hours'))).sort();

  const getDayOfWeekName = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
      }
    } catch {}
    return '';
  };

  const selectedDayName = getDayOfWeekName(selectedDate);
  const isWeekend = selectedDayName === 'Friday' || selectedDayName === 'Saturday';

  // Load records for the selectedDate when it changes or when global attendance is populated
  useEffect(() => {
    const recordsForDate = attendance.filter((a) => a.date === selectedDate);
    const mapping: Record<string, AttendanceStatus> = {};

    // First, default all active students to Present
    activeStudents.forEach((s) => {
      mapping[s.id] = AttendanceStatus.Present;
    });

    // Overwrite with saved records if they exist
    recordsForDate.forEach((r) => {
      mapping[r.studentId] = r.status;
    });

    setLocalRecords(mapping);
  }, [selectedDate, attendance, students]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    // Prevent changing if already submitted (locked)
    const isAlreadySubmitted = attendance.some((att) => att.studentId === studentId && att.date === selectedDate);
    if (isAlreadySubmitted) {
      showToast('This attendance is submitted and locked!');
      return;
    }
    setLocalRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAllPresent = () => {
    const studentsToMark = selectedBatch
      ? activeStudents.filter((s) => (s.batchTime || 'Flexible Hours') === selectedBatch)
      : activeStudents;

    const updated = { ...localRecords };
    let markedCount = 0;
    studentsToMark.forEach((s) => {
      const isAlreadySubmitted = attendance.some((att) => att.studentId === s.id && att.date === selectedDate);
      if (!isAlreadySubmitted) {
        updated[s.id] = AttendanceStatus.Present;
        markedCount++;
      }
    });
    setLocalRecords(updated);
    if (markedCount > 0) {
      showToast(`${markedCount} unsubmitted students marked Present locally. Please submit them individually to lock and save!`);
    } else {
      showToast(`All students in this batch are already submitted and locked!`);
    }
  };

  const handleSingleSave = (studentId: string, studentName: string) => {
    const statusToSave = localRecords[studentId] || AttendanceStatus.Present;
    saveAttendanceRecords(selectedDate, [{
      date: selectedDate,
      studentId: studentId,
      status: statusToSave,
    }]);
    showToast(`${studentName} এর উপস্থিতি সফলভাবে সাবমিট করা হয়েছে (${statusToSave})!`);
  };

  // Helper to fetch actual/live status for stats and rendering (prioritizing saved/locked state)
  const getStudentStatus = (studentId: string) => {
    const saved = attendance.find((att) => att.studentId === studentId && att.date === selectedDate);
    return saved ? saved.status : (localRecords[studentId] || AttendanceStatus.Present);
  };

  // Stats calculation based on current context (selected batch vs all active students)
  const currentBatchStudents = selectedBatch
    ? activeStudents.filter((s) => (s.batchTime || 'Flexible Hours') === selectedBatch)
    : activeStudents;

  const totalSlots = currentBatchStudents.length;
  const countPresent = currentBatchStudents.filter((s) => getStudentStatus(s.id) === AttendanceStatus.Present).length;
  const countLate = currentBatchStudents.filter((s) => getStudentStatus(s.id) === AttendanceStatus.Late).length;
  const countAbsent = currentBatchStudents.filter((s) => getStudentStatus(s.id) === AttendanceStatus.Absent).length;
  const countLeave = currentBatchStudents.filter((s) => getStudentStatus(s.id) === AttendanceStatus.Leave).length;

  const attendanceRate = totalSlots > 0 ? Math.round(((countPresent + countLate) / totalSlots) * 100) : 0;

  // History / Report Calculations
  const getDatesList = (): string[] => {
    const dates = Array.from(new Set(attendance.map((a) => a.date))) as string[];
    if (!dates.includes('2026-07-10')) dates.push('2026-07-10');
    return dates.sort((a, b) => b.localeCompare(a));
  };

  const datesList = getDatesList();

  const handleExportCSV = () => {
    const header = 'Student Name,Roll,Class,Date,Status\n';
    const rows = activeStudents.map((s) => {
      const status = localRecords[s.id] || 'Present';
      return `"${s.name}",${s.roll},"${s.classLevel}","${selectedDate}","${status}"`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_report_${selectedDate}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 select-none">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Daily Attendance Management
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Log, track, and export student attendance registers with automated percentages.
          </p>
        </div>

        {/* Date Selector Header */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 focus:border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
          />
        </div>
      </div>

      {/* Sub Tabs Toggle */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('take')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'take'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Take Attendance Grid
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Historical Registers & Sheets
        </button>
      </div>

      {activeTab === 'take' && (
        <div className="space-y-6 animate-fade-in">
          {isWeekend && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                  !
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-400">Scheduled Weekend ({selectedDayName}) Off-Day</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Friday and Saturday are official weekly holidays. No regular classes are scheduled.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 px-2 py-1 rounded-lg">
                OFF-DAY
              </span>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                {selectedBatch ? `${selectedBatch} Rate` : 'Overall Rate'}
              </span>
              <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">{attendanceRate}%</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Present</span>
              <span className="text-2xl font-bold text-slate-200 font-mono mt-1 block">{countPresent}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Late</span>
              <span className="text-2xl font-bold text-amber-400 font-mono mt-1 block">{countLate}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Absent</span>
              <span className="text-2xl font-bold text-rose-400 font-mono mt-1 block">{countAbsent}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-center col-span-2 md:col-span-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">On Leave</span>
              <span className="text-2xl font-bold text-slate-500 font-mono mt-1 block">{countLeave}</span>
            </div>
          </div>

          {selectedBatch === null ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                    Select a Batch to Take Attendance (ব্যাচ নির্বাচন করুন)
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Select an active batch below to log, review, or edit student rolls for this date.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uniqueBatches.map((batchName) => {
                  const batchStudents = activeStudents.filter((s) => (s.batchTime || 'Flexible Hours') === batchName);
                  const totalCount = batchStudents.length;
                  
                  // Check submission status for selectedDate
                  const savedCount = batchStudents.filter((s) => 
                    attendance.some((att) => att.studentId === s.id && att.date === selectedDate)
                  ).length;

                  let statusText = "Pending";
                  let statusColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";
                  if (savedCount === totalCount && totalCount > 0) {
                    statusText = "✓ Submitted";
                    statusColor = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
                  } else if (savedCount > 0) {
                    statusText = `Partial (${savedCount}/${totalCount})`;
                    statusColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
                  }

                  return (
                    <div 
                      key={batchName}
                      onClick={() => setSelectedBatch(batchName)}
                      className="group bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-5 shadow-lg hover:shadow-emerald-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between h-40 select-none relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-slate-800 group-hover:bg-emerald-500 transition-colors"></div>
                      <div className="space-y-3 pl-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-display font-bold text-slate-100 group-hover:text-emerald-400 text-[15px] tracking-tight transition-colors flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-emerald-450 shrink-0" />
                            {batchName}
                          </h4>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${statusColor}`}>
                            {statusText}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{totalCount} Active Students</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 group-hover:text-emerald-400 font-bold transition-colors pl-1">
                        <span>ব্যাচে প্রবেশ করুন (Enter Register)</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}

                {uniqueBatches.length === 0 && (
                  <div className="col-span-full py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
                    <p className="text-slate-400 text-sm font-bold">কোনো সক্রিয় ব্যাচ পাওয়া যায়নি (No active batches found)</p>
                    <p className="text-slate-500 text-xs mt-1">দয়া করে Spreadsheet থেকে শিক্ষার্থীদের সক্রিয় করুন এবং ব্যাচ নির্ধারণ করুন।</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Batch Detail Header Card */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedBatch(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> ব্যাচ সমূহে ফিরুন (All Batches)
                  </button>
                  <div className="h-5 w-px bg-slate-800 hidden sm:block"></div>
                  <div>
                    <span className="text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider block">Active Batch Register</span>
                    <h3 className="text-sm font-bold text-slate-100">Time Slot: {selectedBatch}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">
                    Students: <strong className="text-slate-300 font-mono">{currentBatchStudents.length}</strong>
                  </span>
                </div>
              </div>

              {/* Quick Shortcuts */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/20 p-3 border border-slate-800/60 rounded-xl gap-3">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleMarkAllPresent}
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 text-xs font-bold rounded-lg transition text-left"
                  >
                    ✓ Mark All Unsubmitted Present (Shortcut)
                  </button>
                  <span className="text-[10px] text-slate-500 pl-0.5">Note: Each student must still be submitted individually to be locked.</span>
                </div>

                <div className="flex w-full sm:w-auto gap-2 justify-end items-center">
                  <button
                    onClick={handleExportCSV}
                    className="p-1.5 bg-slate-900 border border-slate-800 hover:text-slate-100 rounded-lg text-slate-400"
                    title="Export register to CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handlePrint}
                    className="p-1.5 bg-slate-900 border border-slate-800 hover:text-slate-100 rounded-lg text-slate-400"
                    title="Print class roll"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Student Roll Call Grid */}
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-4 w-16 text-center">Roll</th>
                        <th className="p-4">Student Name</th>
                        <th className="p-4">Class Level</th>
                        <th className="p-4">School</th>
                        <th className="p-4 text-center w-72">Attendance Mark</th>
                        <th className="p-4 text-center w-36">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {currentBatchStudents.map((s, index) => {
                        const isSubmitted = attendance.some((att) => att.studentId === s.id && att.date === selectedDate);
                        const currentStatus = getStudentStatus(s.id);

                        return (
                          <tr key={s.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="p-4 text-center font-bold text-slate-400">{s.roll}</td>
                            <td className="p-4 font-semibold text-slate-200">
                              {index + 1}. {s.name}
                              {s.nameBangla && (
                                <span className="block text-[10px] text-slate-400 font-normal mt-0.5 font-bengali">
                                  {s.nameBangla}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-slate-300">
                              {s.classLevel}
                              <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                                {s.groupName}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400 truncate max-w-xs">{s.school}</td>
                            <td className="p-4">
                              <div className="flex justify-center items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
                                {/* Present Button */}
                                <button
                                  disabled={isSubmitted}
                                  onClick={() => handleStatusChange(s.id, AttendanceStatus.Present)}
                                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    isSubmitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                  } ${
                                    currentStatus === AttendanceStatus.Present
                                      ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  Present
                                </button>
                                {/* Late Button */}
                                <button
                                  disabled={isSubmitted}
                                  onClick={() => handleStatusChange(s.id, AttendanceStatus.Late)}
                                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    isSubmitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                  } ${
                                    currentStatus === AttendanceStatus.Late
                                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Late
                                </button>
                                {/* Absent Button */}
                                <button
                                  disabled={isSubmitted}
                                  onClick={() => handleStatusChange(s.id, AttendanceStatus.Absent)}
                                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    isSubmitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                  } ${
                                    currentStatus === AttendanceStatus.Absent
                                      ? 'bg-rose-500 text-slate-950 shadow-md font-extrabold'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Absent
                                </button>
                                {/* Leave Button */}
                                <button
                                  disabled={isSubmitted}
                                  onClick={() => handleStatusChange(s.id, AttendanceStatus.Leave)}
                                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    isSubmitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                  } ${
                                    currentStatus === AttendanceStatus.Leave
                                      ? 'bg-slate-800 text-slate-200 border border-slate-700 font-extrabold'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  Leave
                                </button>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              {isSubmitted ? (
                                <span className="inline-flex items-center gap-1 py-1 px-2.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-bold rounded-lg text-[10px] uppercase tracking-wide select-none">
                                  <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Locked
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSingleSave(s.id, s.name)}
                                  className="w-full py-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-[10px] uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Submit
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {currentBatchStudents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                            No students registered under this batch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Historical Dates Register list */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-wider">Historical Logs</h3>
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3 space-y-1">
              {datesList.map((dt) => {
                const isSelected = selectedDate === dt;
                const records = attendance.filter((a) => a.date === dt);
                const presents = records.filter((r) => r.status === AttendanceStatus.Present || r.status === AttendanceStatus.Late).length;

                return (
                  <button
                    key={dt}
                    onClick={() => setSelectedDate(dt)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition ${
                      isSelected
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-slate-900/40 hover:bg-slate-800 border border-transparent text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <div>
                        <p className="text-xs font-bold">{dt}</p>
                        <span className="text-[10px] text-slate-500 block">
                          {records.length > 0 ? `${presents}/${records.length} Present` : 'Unsaved register'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      {records.length > 0 ? `${Math.round((presents / records.length) * 100)}%` : '0%'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Columns: Inspection of selected register details */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                Inspection: Register Sheet ({selectedDate})
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/60 px-2 py-0.5 rounded">
                Static Snapshot
              </span>
            </div>

            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <p className="text-xs text-slate-400">
                  Showing historical records loaded from storage client database.
                </p>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 text-[10px] text-emerald-400 hover:underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export snapshot CSV
                </button>
              </div>

              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {activeStudents.map((s) => {
                  const record = attendance.find((a) => a.date === selectedDate && a.studentId === s.id);
                  const status = record?.status || 'Unmarked';

                  return (
                    <div key={s.id} className="p-2 bg-slate-900/50 border border-slate-800/80 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-200">{s.name}</p>
                        <span className="text-[10px] text-slate-500 font-mono">Roll: {s.roll} • {s.classLevel}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                        status === AttendanceStatus.Present ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        status === AttendanceStatus.Late ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        status === AttendanceStatus.Absent ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
