/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Student, StudentStatus } from '../types';
import {
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Search,
  ChevronDown,
  Eye,
  EyeOff,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  Check,
  Edit2,
  Calendar,
  ClipboardList,
  Lock,
  Unlock,
  Coins,
  DollarSign
} from 'lucide-react';

type ColKey = keyof Student;

interface ColumnConfig {
  key: ColKey;
  label: string;
  width: number;
  type: 'number' | 'text' | 'select' | 'date' | 'datetime-local';
  options?: string[];
}

const formatAdmissionDate = (dateStr: any) => {
  if (!dateStr) return '';
  const str = String(dateStr);
  if (str.includes('T')) {
    const [d, t] = str.split('T');
    const [year, month, day] = d.split('-');
    const [hourStr, minStr] = t.split(':');
    let hour = parseInt(hourStr, 10);
    const min = minStr || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    const formattedHour = String(hour).padStart(2, '0');
    return `${day}/${month}/${year} ${formattedHour}:${min} ${ampm}`;
  }
  return str;
};

export default function StudentView() {
  const {
    students,
    addStudent,
    updateStudent,
    deleteStudent,
    duplicateStudent,
    bulkDeleteStudents,
    attendance,
    feePayments,
    updateFeePayments,
    logAction,
    showToast,
    adminPassword,
    addSmsLog,
    settings,
  } = useApp();

  // Columns Configuration
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'name', label: 'Name (English)', width: 280, type: 'text' },
    { key: 'classLevel', label: 'Class', width: 160, type: 'select', options: ['Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8'] },
    { key: 'batchTime', label: 'Batch Time', width: 200, type: 'select', options: ['07:00 AM', '09:00 AM', '02:00 PM', '04:00 PM', '07:00 PM', '09:00 PM'] },
  ]);

  const [hiddenCols, setHiddenCols] = useState<Set<ColKey>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: ColKey; direction: 'asc' | 'desc' } | null>({ key: 'roll', direction: 'asc' });
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const startEditingStudentProfile = (student: Student) => {
    setEditingStudentId(student.id);
    setNewStudentForm({
      roll: student.roll,
      name: student.name,
      nameBangla: student.nameBangla || '',
      classLevel: student.classLevel,
      groupName: student.groupName,
      batch: student.batch,
      batchTime: student.batchTime,
      school: student.school,
      schoolRoll: student.schoolRoll || '',
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      fathersName: student.fathersName || student.parentName || '',
      fathersPhone: student.fathersPhone || student.parentPhone || '',
      mothersName: student.mothersName || '',
      mothersPhone: student.mothersPhone || '',
      monthlyFee: student.monthlyFee,
      admissionDate: student.admissionDate,
      status: student.status,
      notes: student.notes || '',
    });
    setShowAddModal(true);
  };

  // Interactive Grid States (Keyboard Navigation & Inline Editing)
  const [focusedCell, setFocusedCell] = useState<{ rowId: string; colKey: ColKey } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: ColKey } | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [showColSettings, setShowColSettings] = useState(false);

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentReportTab, setStudentReportTab] = useState<'summary' | 'details' | 'finance'>('summary');

  const handleDeleteAllStudents = () => {
    const allIds = students.map(s => s.id);
    if (allIds.length > 0) {
      bulkDeleteStudents(allIds);
    }
    setShowDeleteAllConfirm(false);
  };

  const getLocalDatetimeString = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const [newStudentForm, setNewStudentForm] = useState<Omit<Student, 'id'>>({
    roll: undefined as any,
    name: '',
    nameBangla: '',
    classLevel: '',
    groupName: '',
    batch: 'Regular Batch',
    batchTime: '',
    school: '',
    schoolRoll: '',
    parentName: '',
    parentPhone: '',
    fathersName: '',
    fathersPhone: '',
    mothersName: '',
    mothersPhone: '',
    monthlyFee: undefined as any,
    admissionDate: getLocalDatetimeString(),
    status: StudentStatus.Active,
    notes: '',
  });

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingStudentId(null);
    setNewStudentForm({
      roll: undefined as any,
      name: '',
      nameBangla: '',
      classLevel: '',
      groupName: '',
      batch: 'Regular Batch',
      batchTime: '',
      school: '',
      schoolRoll: '',
      parentName: '',
      parentPhone: '',
      fathersName: '',
      fathersPhone: '',
      mothersName: '',
      mothersPhone: '',
      monthlyFee: undefined as any,
      admissionDate: getLocalDatetimeString(),
      status: StudentStatus.Active,
      notes: '',
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sort & Filter
  const filteredStudents = students
    .filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.parentPhone.includes(searchQuery) ||
        s.parentName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchClass = filterClass === 'All' || s.classLevel === filterClass;
      const matchStatus = filterStatus === 'All' || s.status === filterStatus;

      return matchSearch && matchClass && matchStatus;
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      let valA = a[key];
      let valB = b[key];

      if (typeof valA === 'string') {
        return direction === 'asc'
          ? valA.localeCompare(valB as string)
          : (valB as string).localeCompare(valA);
      }
      if (typeof valA === 'number') {
        return direction === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
      return 0;
    });

  // Keyboard navigation controller
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedCell || editingCell) return;

      const visibleCols = columns.filter((c) => !hiddenCols.has(c.key));
      const colIndex = visibleCols.findIndex((c) => c.key === focusedCell.colKey);
      const rowIndex = filteredStudents.findIndex((s) => s.id === focusedCell.rowId);

      if (rowIndex === -1) return;

      let newRowIndex = rowIndex;
      let newColIndex = colIndex;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (rowIndex > 0) newRowIndex--;
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (rowIndex < filteredStudents.length - 1) newRowIndex++;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (colIndex > 0) newColIndex--;
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (colIndex < visibleCols.length - 1) newColIndex++;
          break;
        case 'Enter':
          e.preventDefault();
          // Enter inline editing
          startEditing(focusedCell.rowId, focusedCell.colKey);
          return;
        case 'Delete':
        case 'Backspace':
          // Wipe contents (only if cell edit is permitted)
          const targetStudent = filteredStudents[rowIndex];
          const key = focusedCell.colKey;
          if (key !== 'id') {
            updateStudent({
              ...targetStudent,
              [key]: key === 'roll' || key === 'monthlyFee' ? 0 : '',
            });
          }
          return;
        default:
          return;
      }

      setFocusedCell({
        rowId: filteredStudents[newRowIndex].id,
        colKey: visibleCols[newColIndex].key,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedCell, editingCell, filteredStudents, columns, hiddenCols]);

  const handleSort = (key: ColKey) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Inline edit actions
  const startEditing = (rowId: string, colKey: ColKey) => {
    const s = students.find((std) => std.id === rowId);
    if (!s) return;
    setEditingCell({ rowId, colKey });
    setEditValue(s[colKey]);
  };

  const saveInlineEdit = () => {
    if (!editingCell) return;
    const { rowId, colKey } = editingCell;
    const s = students.find((std) => std.id === rowId);
    if (!s) return;

    let parsedVal = editValue;
    const colConfig = columns.find((c) => c.key === colKey);
    if (colConfig?.type === 'number') {
      parsedVal = parseFloat(editValue) || 0;
    }

    updateStudent({
      ...s,
      [colKey]: parsedVal,
    });
    setEditingCell(null);
  };

  // Column Resizer
  const handleResize = (e: React.MouseEvent, key: ColKey) => {
    e.preventDefault();
    const startX = e.pageX;
    const startCol = columns.find((c) => c.key === key);
    if (!startCol) return;
    const startWidth = startCol.width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.pageX - startX;
      setColumns((prev) =>
        prev.map((c) => (c.key === key ? { ...c, width: Math.max(50, startWidth + delta) } : c))
      );
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const toggleHideCol = (key: ColKey) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // CSV Exports
  const handleExportCSV = () => {
    const visibleCols = columns.filter((c) => !hiddenCols.has(c.key));
    const headerRow = visibleCols.map((c) => `"${c.label}"`).join(',');
    const bodyRows = filteredStudents.map((s) =>
      visibleCols.map((c) => `"${(s[c.key] ?? '').toString().replace(/"/g, '""')}"`).join(',')
    );

    const csvContent = [headerRow, ...bodyRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  // CSV Imports
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').map((line) => line.trim()).filter((line) => line);
      if (lines.length <= 1) return; // Empty or headers only

      // Quick simple CSV parse
      const rows = lines.slice(1).map((line) => {
        // split by comma but respect quotes
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        return matches.map((val) => val.replace(/^"|"$/g, '').trim());
      });

      let addedCount = 0;
      rows.forEach((row) => {
        if (row.length < 5) return; // Invalid row
        const s: Omit<Student, 'id'> = {
          roll: parseInt(row[0], 10) || students.length + addedCount + 1,
          name: row[1] || 'Unknown Student',
          classLevel: row[2] || 'Class 4',
          groupName: row[3] || 'General',
          batch: row[4] || 'Default Batch',
          batchTime: row[5] || '07:00 AM',
          school: row[6] || '',
          parentName: row[7] || '',
          parentPhone: row[8] || '',
          monthlyFee: parseFloat(row[9]) || 5000,
          admissionDate: row[10] || new Date().toISOString().split('T')[0],
          status: row[11]?.toLowerCase() === 'inactive' ? StudentStatus.Inactive : StudentStatus.Active,
          notes: row[12] || '',
        };
        addStudent(s);
        addedCount++;
      });
    };
    reader.readAsText(file);
  };

  const sendWelcomeSMS = async (student: Student) => {
    try {
      const student_name = student.nameBangla 
        ? `${student.name} (${student.nameBangla})` 
        : student.name;
      const class_level = student.classLevel || 'N/A';
      const batch_time = student.batchTime || 'N/A';
      const monthly_fee = student.monthlyFee ? `৳${student.monthlyFee.toLocaleString()}` : 'N/A';

      const messageText = `প্রিয় অভিভাবক,\nআসসালামু আলাইকুম।\n\"Math & Science Care\"-এর প্রতি আস্থা রাখার জন্য আন্তরিক ধন্যবাদ।\nআমরা আনন্দের সঙ্গে জানাচ্ছি যে, \"শিক্ষার্থী ${student_name}\"-এর ভর্তি সফলভাবে সম্পন্ন হয়েছে।\nভর্তির তথ্য:\n• শিক্ষার্থী: \"${student_name}\"\n• শ্রেণি: ${class_level}\n• ব্যাচ: ${batch_time}\n• মাসিক বেতন: ${monthly_fee}\nনিয়মিত ক্লাস, পরীক্ষা ও অগ্রগতির মাধ্যমে শিক্ষার্থীর সর্বোচ্চ উন্নয়নে আমরা প্রতিশ্রুতিবদ্ধ।\nযেকোনো প্রয়োজনে যোগাযোগ করুন:\n📞 01984428632\nশিক্ষার্থীর সফলতা ও উজ্জ্বল ভবিষ্যৎ কামনা করি।\nধন্যবাদান্তে,\nMath & Science Care`;

      // Clean and standardize phone numbers to 11 digits starting with '01'
      const cleanPhoneNumber = (phone: string): string => {
        let cleaned = (phone || '').replace(/[^\d]/g, '');
        if (cleaned.length === 13 && cleaned.startsWith('8801')) {
          cleaned = cleaned.substring(2);
        }
        if (cleaned.length === 10 && cleaned.startsWith('1')) {
          cleaned = '0' + cleaned;
        }
        return cleaned;
      };

      const fatherPhone = student.fathersPhone || student.parentPhone || '';
      const motherPhone = student.mothersPhone || '';

      const fatherCleaned = cleanPhoneNumber(fatherPhone);
      const motherCleaned = cleanPhoneNumber(motherPhone);

      const rawPhones = [fatherPhone, motherPhone];
      const validPhones = Array.from(new Set(rawPhones.map(cleanPhoneNumber).filter(p => p.length === 11 && p.startsWith('01'))));

      if (validPhones.length === 0) {
        console.log('[StudentView] No valid phone numbers found to send welcome SMS.');
        return;
      }

      // Trigger separate independent fetch requests to guarantee delivery to both parents
      for (const phone of validPhones) {
        const recipientRole = phone === fatherCleaned ? 'Father' : 'Mother';
        let status: 'Success' | 'Failed' = 'Failed';
        let responseRaw = '';

        if (settings.smsServiceEnabled === false) {
          console.log("SMS service is disabled in settings. Skipping admission SMS dispatch.");
          addSmsLog({
            student_name: student.name,
            recipient_role: recipientRole,
            phone_number: phone,
            message_type: 'Admission',
            message_content: messageText,
            status: 'Failed',
            response_raw: 'SMS service is disabled by administrator in settings',
          });
          continue;
        }

        try {
          console.log("Sending SMS to:", phone);
          const payload = new URLSearchParams({
            msisdn: phone,
            smstext: messageText,
            smsformat: "8"
          });

          const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Admin-Password': adminPassword,
            },
            body: payload.toString(),
          });

          responseRaw = `HTTP ${response.status}`;
          if (response.ok) {
            const data = await response.json();
            responseRaw = JSON.stringify(data);
            if (data.success) {
              status = 'Success';
              showToast('🚀 নতুন শিক্ষার্থীর অভিভাবকদের নিকট ভর্তি নিশ্চিতকরণের অটোমেটিক SMS পাঠানো হয়েছে!');
              console.log(`✓ Welcome SMS successfully sent to ${phone}`, data);
            } else {
              console.error(`✗ Welcome SMS failed for number ${phone}:`, data.error || data);
            }
          } else {
            const errText = await response.text();
            responseRaw = errText;
            console.error(`✗ Welcome SMS network response failed for number ${phone}:`, errText);
          }
        } catch (err) {
          responseRaw = err instanceof Error ? err.message : String(err);
          console.error(`✗ Failed to send welcome SMS to ${phone}:`, err);
        } finally {
          addSmsLog({
            student_name: student.name,
            recipient_role: recipientRole,
            phone_number: phone,
            message_type: 'Admission',
            message_content: messageText,
            status,
            response_raw: responseRaw,
          });
        }
      }
    } catch (err) {
      console.error('[StudentView] Error inside sendWelcomeSMS:', err);
    }
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-calculate tuition roll if not provided
    const roll = newStudentForm.roll || (students.length > 0 ? Math.max(...students.map(s => s.roll || 0)) + 1 : 1);
    
    // Auto-add admission date to today if not set or invalid
    const admissionDate = newStudentForm.admissionDate || getLocalDatetimeString();

    // Map fathersName and fathersPhone into parentName and parentPhone as standard fallbacks
    const parentName = newStudentForm.fathersName || newStudentForm.parentName || '';
    const parentPhone = newStudentForm.fathersPhone || newStudentForm.parentPhone || '';

    const studentToSave = {
      ...newStudentForm,
      roll,
      admissionDate,
      parentName,
      parentPhone,
    };

    if (editingStudentId) {
      updateStudent({
        ...studentToSave,
        id: editingStudentId,
      } as Student);
      setEditingStudentId(null);
    } else {
      const savedStudent = addStudent(studentToSave);
      // Dispatch automated welcome SMS in the background
      sendWelcomeSMS(savedStudent);
    }

    setShowAddModal(false);
    setNewStudentForm({
      roll: undefined as any,
      name: '',
      nameBangla: '',
      classLevel: '',
      groupName: '',
      batch: 'Regular Batch',
      batchTime: '',
      school: '',
      schoolRoll: '',
      parentName: '',
      parentPhone: '',
      fathersName: '',
      fathersPhone: '',
      mothersName: '',
      mothersPhone: '',
      monthlyFee: undefined as any,
      admissionDate: getLocalDatetimeString(),
      status: StudentStatus.Active,
      notes: '',
    });
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Title & Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            Student Management
            <span className="text-[11px] bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full">
              {filteredStudents.length === students.length ? `Total: ${students.length}` : `Filtered: ${filteredStudents.length} / ${students.length}`}
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Excel-style fully interactive database with inline editing and multi-row features.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Column Hider & Settings */}
          <div className="relative">
            <button
              onClick={() => setShowColSettings(!showColSettings)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Columns
            </button>
            {showColSettings && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-30 max-h-72 overflow-y-auto">
                <div className="flex justify-between items-center px-2 py-1 border-b border-slate-800 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Toggle Columns</span>
                  <button onClick={() => setShowColSettings(false)} className="text-slate-400 hover:text-slate-100">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {columns.map((c) => {
                  const isHidden = hiddenCols.has(c.key);
                  return (
                    <button
                      key={c.key}
                      onClick={() => toggleHideCol(c.key)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-left text-slate-300 hover:text-slate-100"
                    >
                      {isHidden ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                      {c.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCSV}
            accept=".csv"
            className="hidden"
          />

          {students.length > 0 && (
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Delete All
            </button>
          )}

          <button
            onClick={() => {
              setEditingStudentId(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Filtering & Search Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl select-none">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, phone, school..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 outline-none placeholder-slate-500 transition"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-2 outline-none"
          >
            <option value="All">All Classes</option>
            <option value="Class 4">Class 4</option>
            <option value="Class 5">Class 5</option>
            <option value="Class 6">Class 6</option>
            <option value="Class 7">Class 7</option>
            <option value="Class 8">Class 8</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-2 outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* The Advanced Spreadsheet Grid */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
          <table className="w-full border-collapse text-left text-xs text-slate-300 select-none">
            {/* Table Header */}
            <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10 border-b border-slate-800">
              <tr>
                {columns
                  .filter((c) => !hiddenCols.has(c.key))
                  .map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className="p-3 font-semibold relative select-none hover:bg-slate-900 group"
                    >
                      <div
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="truncate">{col.label}</span>
                        {sortConfig?.key === col.key && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {sortConfig.direction === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>

                      {/* Column Resize Handle */}
                      <div
                        onMouseDown={(e) => handleResize(e, col.key)}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-emerald-500/40 active:bg-emerald-500 z-10"
                      />
                    </th>
                  ))}
                <th className="p-3 text-center w-24 sticky right-0 bg-slate-950 border-l border-slate-800">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredStudents.map((s, index) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  {columns
                    .filter((c) => !hiddenCols.has(c.key))
                    .map((col) => {
                      const isFocused = focusedCell?.rowId === s.id && focusedCell?.colKey === col.key;
                      const isEditing = editingCell?.rowId === s.id && editingCell?.colKey === col.key;

                      return (
                        <td
                          key={col.key}
                          onClick={() => setFocusedCell({ rowId: s.id, colKey: col.key })}
                          onDoubleClick={() => startEditing(s.id, col.key)}
                          className={`p-2.5 truncate font-medium border-r border-slate-800/40 relative min-h-[36px] ${
                            isFocused ? 'ring-2 ring-emerald-500/60 z-20 bg-slate-800/20' : ''
                          }`}
                        >
                          {isEditing ? (
                            col.type === 'select' ? (
                              <select
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveInlineEdit}
                                autoFocus
                                className="w-full h-full bg-slate-950 text-slate-100 outline-none border border-emerald-500 rounded p-1 text-xs"
                              >
                                {col.options?.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={col.type}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveInlineEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlineEdit();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                autoFocus
                                className="w-full bg-slate-950 text-slate-100 outline-none border border-emerald-500 rounded px-1.5 py-0.5 text-xs"
                              />
                            )
                          ) : (
                            <span className="block truncate max-w-xs">
                              {col.key === 'name' ? `${index + 1}. ${s[col.key]}` :
                               col.key === 'monthlyFee' ? `৳${(s[col.key] as number).toLocaleString()}` :
                               col.key === 'admissionDate' ? formatAdmissionDate(s[col.key]) :
                               col.key === 'status' ? (
                                 <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                   s[col.key] === StudentStatus.Active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                                 }`}>
                                   {s[col.key]}
                                 </span>
                               ) :
                               (s[col.key] ?? '').toString()}
                            </span>
                          )}
                        </td>
                      );
                    })}

                  {/* Actions Column */}
                  <td className="p-2 w-24 text-center sticky right-0 bg-slate-950 border-l border-slate-800/60 z-10 flex gap-1 justify-center">
                    <button
                      onClick={() => {
                        setViewingStudent(s);
                        setStudentReportTab('summary');
                      }}
                      title="View Profile & Attendance Analytics"
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => startEditingStudentProfile(s)}
                      title="Edit Student Profile"
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingStudent(s)}
                      title="Delete Row"
                      className="p-1 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="py-12 text-center text-slate-500 text-sm">
                    No student records matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Keyboard Instructions Footer */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex flex-wrap gap-x-4 gap-y-2 justify-between">
          <div className="flex gap-3">
            <span>⌨ Double-click / [Enter] to Edit</span>
            <span>• [Arrows] to Navigate</span>
            <span>• [Esc] to Cancel</span>
            <span>• [Delete] to wipe cell</span>
          </div>
          <span>Total Records: {filteredStudents.length}</span>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-display font-bold text-slate-200 text-md">
                  {editingStudentId ? 'Edit Student Profile' : 'Register New Student'}
                </h3>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {editingStudentId ? 'Update details of the student profile.' : 'Fill out all compulsory academic and family details.'}
                </p>
              </div>
              <button onClick={closeAddModal} className="text-slate-400 hover:text-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-6 text-xs">
              {/* Section 1: Academic & Tuition */}
              <div className="space-y-3">
                <h4 className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800/60 pb-1">
                  1. Tuition & Academic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col space-y-1">
                    <label className="text-emerald-400 font-medium">Name (English) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adnan Sami"
                      value={newStudentForm.name}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                      className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-emerald-400 font-medium">Name (Bengali) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: আদনান সামী"
                      value={newStudentForm.nameBangla || ''}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, nameBangla: e.target.value })}
                      className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-emerald-400 font-medium">Class Level <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={newStudentForm.classLevel}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, classLevel: e.target.value })}
                      className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                    >
                      <option value="" disabled hidden>-- শ্রেণি নির্বাচন করুন --</option>
                      <option value="" disabled>-- শ্রেণি নির্বাচন করুন --</option>
                      <option value="Class 4">Class 4</option>
                      <option value="Class 5">Class 5</option>
                      <option value="Class 6">Class 6</option>
                      <option value="Class 7">Class 7</option>
                      <option value="Class 8">Class 8</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-emerald-400 font-medium">Tuition Roll <span className="text-slate-500">(Optional)</span></label>
                    <input
                      type="number"
                      placeholder="Auto-assigned if blank"
                      value={newStudentForm.roll ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewStudentForm({ 
                          ...newStudentForm, 
                          roll: val === '' ? undefined : parseInt(val, 10) 
                        });
                      }}
                      className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-emerald-400 font-medium">Batch Time <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={newStudentForm.batchTime}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, batchTime: e.target.value })}
                      className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                    >
                      <option value="" disabled hidden>-- ব্যাচের সময় নির্বাচন করুন --</option>
                      <option value="" disabled>-- ব্যাচের সময় নির্বাচন করুন --</option>
                      <option value="07:00 AM">07:00 AM</option>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="07:00 PM">07:00 PM</option>
                      <option value="09:00 PM">09:00 PM</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-emerald-400 font-medium">Monthly Fee (৳) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="যেমন: 2500"
                      value={newStudentForm.monthlyFee !== undefined && !isNaN(newStudentForm.monthlyFee) ? newStudentForm.monthlyFee : ''}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, monthlyFee: e.target.value === '' ? undefined as any : parseFloat(e.target.value) })}
                      className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: School Information */}
              <div className="space-y-3">
                <h4 className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800/60 pb-1">
                  2. School Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col space-y-1 md:col-span-1">
                    <label className="text-emerald-400 font-medium">School / College Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajuk Uttara Model College"
                      value={newStudentForm.school}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, school: e.target.value })}
                      className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-emerald-400 font-medium">School Group <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Science, Commerce, Arts"
                      value={newStudentForm.groupName}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, groupName: e.target.value })}
                      className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-emerald-400 font-medium">School Roll Number <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 104"
                      value={newStudentForm.schoolRoll || ''}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, schoolRoll: e.target.value })}
                      className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Family Contacts */}
              <div className="space-y-3">
                <h4 className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800/60 pb-1">
                  3. Family Contacts (Compulsory)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Father's Details</p>
                    <div className="flex flex-col space-y-1">
                      <label className="text-emerald-400 font-medium">Father's Full Name <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mahmudul Hasan"
                        value={newStudentForm.fathersName || ''}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, fathersName: e.target.value })}
                        className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <label className="text-emerald-400 font-medium">Father's Phone Number <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 017XXXXXXXX"
                        value={newStudentForm.fathersPhone || ''}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, fathersPhone: e.target.value })}
                        className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mother's Details</p>
                    <div className="flex flex-col space-y-1">
                      <label className="text-emerald-400 font-medium">Mother's Full Name <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Salma Begum"
                        value={newStudentForm.mothersName || ''}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, mothersName: e.target.value })}
                        className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <label className="text-emerald-400 font-medium">Mother's Phone Number <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 018XXXXXXXX"
                        value={newStudentForm.mothersPhone || ''}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, mothersPhone: e.target.value })}
                        className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Administrative Admin Details */}
              <div className="space-y-3">
                <h4 className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800/60 pb-1">
                  4. Administration & Dates
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-emerald-400 font-medium">Admission Date & Time <span className="text-rose-500">*</span></label>
                      <span className="text-emerald-400 font-mono text-[10px] font-bold">
                        {formatAdmissionDate(newStudentForm.admissionDate)}
                      </span>
                    </div>
                    <input
                      type="datetime-local"
                      required
                      value={newStudentForm.admissionDate}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, admissionDate: e.target.value })}
                      className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-emerald-400 font-medium">Administrative Notes</label>
                    <textarea
                      placeholder="Add tuition rules, special guidance or notes..."
                      value={newStudentForm.notes}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, notes: e.target.value })}
                      className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200 h-10 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {editingStudentId ? 'Update Student Profile' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing & Live Monthly Attendance Analytics Modal */}
      {viewingStudent && (() => {
        const getStudentMonthlyStats = (studentId: string) => {
          const studentRecords = attendance.filter((a) => a.studentId === studentId);
          
          const monthStats: { [key: string]: { present: number; absent: number; late: number; leave: number; total: number } } = {};
          
          studentRecords.forEach((rec) => {
            const dateParts = rec.date.split('-');
            if (dateParts.length < 2) return;
            
            const year = dateParts[0];
            const monthNum = parseInt(dateParts[1], 10);
            const monthNames = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const monthName = monthNames[monthNum - 1] || 'Unknown';
            const monthLabel = `${monthName} ${year}`;
            
            if (!monthStats[monthLabel]) {
              monthStats[monthLabel] = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
            }
            
            monthStats[monthLabel].total++;
            if (rec.status === 'Present') {
              monthStats[monthLabel].present++;
            } else if (rec.status === 'Absent') {
              monthStats[monthLabel].absent++;
            } else if (rec.status === 'Late') {
              monthStats[monthLabel].late++;
            } else if (rec.status === 'Leave') {
              monthStats[monthLabel].leave++;
            }
          });
          
          return monthStats;
        };

        const stats = getStudentMonthlyStats(viewingStudent.id);
        const months = Object.keys(stats);

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold font-display text-sm">
                    {viewingStudent.roll || 'N/A'}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-200 text-lg leading-tight flex flex-wrap items-baseline gap-x-2">
                      <span>{viewingStudent.name}</span>
                      {viewingStudent.nameBangla && (
                        <span className="text-xs font-normal text-slate-400">({viewingStudent.nameBangla})</span>
                      )}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Class: <span className="text-slate-200 font-semibold">{viewingStudent.classLevel}</span> • Batch: <span className="text-slate-200 font-semibold">{viewingStudent.batch} ({viewingStudent.batchTime})</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    viewingStudent.status === StudentStatus.Active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {viewingStudent.status}
                  </span>
                  <button onClick={() => setViewingStudent(null)} className="text-slate-400 hover:text-slate-100 p-1.5 hover:bg-slate-800 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Content Scrollable */}
              <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900">
                {/* Left side: Profile Data */}
                <div className="lg:col-span-5 space-y-5">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-800">
                      General Information
                    </h4>
                    <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tuition Roll:</span>
                        <span className="text-slate-200 font-mono font-medium">{viewingStudent.roll || 'Auto-Assigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Class Level:</span>
                        <span className="text-slate-200 font-medium">{viewingStudent.classLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tuition Batch:</span>
                        <span className="text-slate-200 font-medium">{viewingStudent.batch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Batch Time:</span>
                        <span className="text-slate-200 font-medium">{viewingStudent.batchTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Monthly Fee:</span>
                        <span className="text-emerald-400 font-semibold font-mono">৳{(viewingStudent.monthlyFee || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Admission Date & Time:</span>
                        <span className="text-slate-200 font-mono">{formatAdmissionDate(viewingStudent.admissionDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-800">
                      School Particulars
                    </h4>
                    <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">School Name:</span>
                        <span className="text-slate-200 font-medium text-right max-w-[200px] truncate" title={viewingStudent.school}>{viewingStudent.school || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">School Roll:</span>
                        <span className="text-slate-200 font-mono font-medium">{viewingStudent.schoolRoll || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">School Group:</span>
                        <span className="text-slate-200 font-medium">{viewingStudent.groupName || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-800">
                      Family Contact Directory
                    </h4>
                    <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3.5 space-y-3 text-xs">
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Father's Information</p>
                        <div className="flex justify-between pl-1">
                          <span className="text-slate-400">Name:</span>
                          <span className="text-slate-200 font-medium">{viewingStudent.fathersName || viewingStudent.parentName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between pl-1">
                          <span className="text-slate-400">Phone:</span>
                          <a href={`tel:${viewingStudent.fathersPhone || viewingStudent.parentPhone}`} className="text-emerald-400 hover:underline font-mono font-medium">
                            {viewingStudent.fathersPhone || viewingStudent.parentPhone || 'N/A'}
                          </a>
                        </div>
                      </div>
                      
                      <div className="border-t border-slate-800/60 pt-2.5 space-y-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Mother's Information</p>
                        <div className="flex justify-between pl-1">
                          <span className="text-slate-400">Name:</span>
                          <span className="text-slate-200 font-medium">{viewingStudent.mothersName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between pl-1">
                          <span className="text-slate-400">Phone:</span>
                          {viewingStudent.mothersPhone ? (
                            <a href={`tel:${viewingStudent.mothersPhone}`} className="text-emerald-400 hover:underline font-mono font-medium">
                              {viewingStudent.mothersPhone}
                            </a>
                          ) : (
                            <span className="text-slate-500">N/A</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {viewingStudent.notes && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Admin Notes
                      </h4>
                      <p className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-amber-300/80 text-[11px] leading-relaxed">
                        {viewingStudent.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right side: Live Monthly Attendance Statistics */}
                <div className="lg:col-span-7 flex flex-col">
                  {/* Tab header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setStudentReportTab('summary')}
                        className={`text-xs font-bold pb-1.5 border-b-2 transition-all cursor-pointer ${
                          studentReportTab === 'summary'
                            ? 'border-emerald-500 text-emerald-400 font-extrabold'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Month Summary (সংক্ষিপ্ত বিবরণী)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentReportTab('details')}
                        className={`text-xs font-bold pb-1.5 border-b-2 transition-all cursor-pointer ${
                          studentReportTab === 'details'
                            ? 'border-emerald-500 text-emerald-400 font-extrabold'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Detailed Log (তারিখ অনুযায়ী হাজিরা)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentReportTab('finance')}
                        className={`text-xs font-bold pb-1.5 border-b-2 transition-all cursor-pointer ${
                          studentReportTab === 'finance'
                            ? 'border-emerald-500 text-emerald-400 font-extrabold'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Finance (বেতন ট্র্যাকার)
                      </button>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">Live Synced</span>
                  </div>

                  {studentReportTab === 'summary' && (
                    months.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl p-8 text-center bg-slate-950/10">
                        <p className="text-slate-400 font-medium text-xs">No Attendance Records Logged Yet</p>
                        <p className="text-slate-500 text-[10px] max-w-sm mt-1 leading-relaxed">
                          To view live monthly attendance counts, open the <b>Attendance</b> tab and take/save attendance logs for this student.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                        {months.map((month) => {
                          const mData = stats[month];
                          const presentAndLate = mData.present + mData.late;
                          const attendancePercentage = mData.total > 0 ? Math.round((presentAndLate / mData.total) * 100) : 0;
                          
                          let progressColor = 'bg-rose-500';
                          if (attendancePercentage >= 90) progressColor = 'bg-emerald-500';
                          else if (attendancePercentage >= 75) progressColor = 'bg-amber-500';

                          return (
                            <div key={month} className="bg-slate-950/30 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-200 font-bold text-xs">{month}</span>
                                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800/80 ${
                                  attendancePercentage >= 90 ? 'text-emerald-400' : attendancePercentage >= 75 ? 'text-amber-400' : 'text-rose-400'
                                }`}>
                                  {attendancePercentage}% Attended
                                </span>
                              </div>

                              {/* Attendance Progress bar */}
                              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/60">
                                <div 
                                  className={`h-full ${progressColor} transition-all duration-500`} 
                                  style={{ width: `${attendancePercentage}%` }}
                                />
                              </div>

                              {/* Legend counts */}
                              <div className="grid grid-cols-5 gap-2 text-[10px] text-center font-mono font-semibold pt-1">
                                <div className="bg-slate-950/50 p-1.5 rounded-lg border border-slate-900/60">
                                  <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Classes</p>
                                  <p className="text-slate-300 font-bold text-xs">{mData.total}</p>
                                </div>
                                <div className="bg-emerald-500/5 p-1.5 rounded-lg border border-emerald-500/10">
                                  <p className="text-emerald-500 text-[9px] uppercase tracking-wider mb-0.5">Present</p>
                                  <p className="text-emerald-400 font-bold text-xs">{mData.present}</p>
                                </div>
                                <div className="bg-amber-500/5 p-1.5 rounded-lg border border-amber-500/10">
                                  <p className="text-amber-500 text-[9px] uppercase tracking-wider mb-0.5">Late</p>
                                  <p className="text-amber-400 font-bold text-xs">{mData.late}</p>
                                </div>
                                <div className="bg-rose-500/5 p-1.5 rounded-lg border border-rose-500/10">
                                  <p className="text-rose-400 text-[9px] uppercase tracking-wider mb-0.5">Absent</p>
                                  <p className="text-rose-400 font-bold text-xs">{mData.absent}</p>
                                </div>
                                <div className="bg-slate-800/30 p-1.5 rounded-lg border border-slate-800/40">
                                  <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Leave</p>
                                  <p className="text-slate-400 font-bold text-xs">{mData.leave}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}

                  {studentReportTab === 'details' && (() => {
                    const sortedRecords = attendance
                      .filter((a) => a.studentId === viewingStudent.id)
                      .sort((a, b) => b.date.localeCompare(a.date));

                    if (sortedRecords.length === 0) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl p-8 text-center bg-slate-950/10">
                          <p className="text-slate-400 font-medium text-xs">No Detailed Logs Found</p>
                          <p className="text-slate-500 text-[10px] max-w-sm mt-1 leading-relaxed">
                            No individual date entries have been submitted yet. Please check the <b>Attendance</b> tab.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                        <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 border border-slate-800/60 rounded-xl flex justify-between items-center px-3 mb-1">
                          <span>Total Logged Days: <strong className="text-emerald-400 font-mono">{sortedRecords.length}</strong></span>
                          <span className="text-[10px] text-slate-500">Newest to Oldest</span>
                        </div>

                        <div className="divide-y divide-slate-800/50 bg-slate-950/30 border border-slate-800/80 rounded-2xl overflow-hidden">
                          {sortedRecords.map((rec) => {
                            const dateObj = new Date(rec.date);
                            const formattedDateStr = dateObj.toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            });
                            
                            let statusBadgeStyle = '';
                            let statusTextBangla = '';
                            
                            if (rec.status === 'Present') {
                              statusBadgeStyle = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                              statusTextBangla = 'উপস্থিত (Present)';
                            } else if (rec.status === 'Absent') {
                              statusBadgeStyle = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                              statusTextBangla = 'অনুপস্থিত (Absent)';
                            } else if (rec.status === 'Late') {
                              statusBadgeStyle = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                              statusTextBangla = 'দেরি (Late)';
                            } else if (rec.status === 'Leave') {
                              statusBadgeStyle = 'bg-slate-800/60 text-slate-400 border border-slate-700/60';
                              statusTextBangla = 'ছুটি (Leave)';
                            }

                            return (
                              <div key={rec.id} className="p-3 flex items-center justify-between hover:bg-slate-800/10 transition-colors">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-2 h-2 rounded-full ${
                                    rec.status === 'Present' ? 'bg-emerald-500' :
                                    rec.status === 'Absent' ? 'bg-rose-500' :
                                    rec.status === 'Late' ? 'bg-amber-500' : 'bg-slate-600'
                                  }`} />
                                  <div className="space-y-0.5">
                                    <p className="font-mono text-slate-200 text-xs font-bold">{rec.date}</p>
                                    <p className="text-[10px] text-slate-400">{formattedDateStr}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold ${statusBadgeStyle}`}>
                                    {statusTextBangla}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {studentReportTab === 'finance' && (() => {
                    const studentPayments = feePayments.filter(p => p.studentId === viewingStudent.id);

                    const getMonthNameBangla = (monthStr: string) => {
                      const [year, monthNum] = monthStr.split('-');
                      const months = [
                        'January (জানুয়ারি)', 'February (ফেব্রুয়ারি)', 'March (মার্চ)', 'April (এপ্রিল)', 'May (মে)', 'June (জুন)',
                        'July (জুলাই)', 'August (আগস্ট)', 'September (সেপ্টেম্বর)', 'October (অক্টোবর)', 'November (নভেম্বর)', 'December (ডিসেম্বর)'
                      ];
                      return `${months[parseInt(monthNum, 10) - 1] || 'Unknown'} ${year}`;
                    };

                    return (
                      <div className="space-y-5 flex-1 flex flex-col min-h-0">
                        {/* Information Banner */}
                        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start gap-2.5">
                          <Lock className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-200">View-Only Student Ledger (শুধুমাত্র দেখার জন্য)</p>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              বেতন পরিশোধের তথ্য যুক্ত বা পরিবর্তন করতে অনুগ্রহ করে বাম পাশের মেনু থেকে <span className="text-emerald-400 font-bold">Tuition Fee Tracker</span> এ প্রবেশ করুন। সুরক্ষার স্বার্থে এই প্রোফাইল ভিউটি রিড-অনলি করা হয়েছে।
                            </p>
                          </div>
                        </div>

                        {/* Status Overview Card */}
                        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-sans">Monthly Tuition Fee</p>
                            <h4 className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5">
                              ৳{(viewingStudent.monthlyFee || 0).toLocaleString()}
                            </h4>
                          </div>
                          <div className="flex gap-2">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 px-4 text-center">
                              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Total Months Paid</p>
                              <p className="text-sm font-bold font-mono text-emerald-400">
                                {studentPayments.filter(p => p.status === 'Paid').length}
                              </p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 px-4 text-center">
                              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Total Collected</p>
                              <p className="text-sm font-bold font-mono text-slate-200">
                                ৳{studentPayments
                                  .filter(p => p.status === 'Paid')
                                  .reduce((sum, p) => sum + (p.paidAmount || 0), 0)
                                  .toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Payment History List */}
                        <div className="flex-1 flex flex-col min-h-0">
                          <h5 className="text-xs font-bold text-slate-300 mb-2 pb-1 border-b border-slate-800 flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-emerald-400" />
                            Payment History (বেতন পরিশোধের ইতিহাস)
                          </h5>
                          {studentPayments.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl p-6 text-center bg-slate-950/10">
                              <p className="text-slate-500 text-[10px]">No payment history logged for this student yet.</p>
                            </div>
                          ) : (
                            <div className="overflow-y-auto max-h-[35vh] space-y-2 pr-1">
                              {studentPayments
                                .sort((a, b) => b.month.localeCompare(a.month))
                                .map((payment) => {
                                  const isLocked = payment.status === 'Paid';
                                  return (
                                    <div
                                      key={payment.id}
                                      className={`p-3 bg-slate-950/30 border rounded-xl flex items-center justify-between transition-all ${
                                        isLocked ? 'border-emerald-500/20' : 'border-slate-800/60'
                                      }`}
                                    >
                                      <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-200">
                                          {getMonthNameBangla(payment.month)}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                          <span className="font-mono">Base Fee: ৳{payment.amount.toLocaleString()}</span>
                                          <span>•</span>
                                          <span className="font-mono text-slate-300">Received: ৳{payment.paidAmount.toLocaleString()}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        {payment.paymentDate && (
                                          <div className="text-right">
                                            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Paid Date</p>
                                            <p className="text-[10px] text-slate-300 font-mono font-bold">{payment.paymentDate}</p>
                                          </div>
                                        )}
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                          isLocked 
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        }`}>
                                          {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                                          {payment.status}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
                <button
                  onClick={() => setViewingStudent(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-slate-100">সব ছাত্র মুছুন? (Delete All Students?)</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  আপনি কি নিশ্চিত যে আপনি এই ওয়েবসাইট থেকে সব ছাত্রের তথ্য এবং তাদের উপস্থিতি তালিকা চিরতরে মুছে ফেলতে চান? এই কাজটি আর ফিরিয়ে আনা যাবে না।
                </p>
                <p className="text-slate-500 text-[10px] font-mono">
                  (Are you sure you want to permanently delete all student and attendance records? This action cannot be undone.)
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-950/40 border-t border-slate-800/60 flex justify-end gap-2.5">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                বাতিল করুন (Cancel)
              </button>
              <button
                onClick={handleDeleteAllStudents}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer transition"
              >
                হ্যাঁ, সব মুছুন (Yes, Delete All)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Student Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-slate-100">ছাত্র মুছুন? (Delete Student?)</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  আপনি কি নিশ্চিত যে আপনি <strong className="text-rose-400">{deletingStudent.name}</strong> {deletingStudent.nameBangla ? `(${deletingStudent.nameBangla})` : ''} কে ওয়েবসাইট থেকে মুছে ফেলতে চান?
                </p>
                <p className="text-slate-500 text-[10px] font-mono">
                  (Are you sure you want to permanently delete student {deletingStudent.name}?)
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-950/40 border-t border-slate-800/60 flex justify-end gap-2.5">
              <button
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                বাতিল করুন (Cancel)
              </button>
              <button
                onClick={() => {
                  deleteStudent(deletingStudent.id);
                  setDeletingStudent(null);
                }}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer transition"
              >
                হ্যাঁ, মুছুন (Yes, Delete)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
