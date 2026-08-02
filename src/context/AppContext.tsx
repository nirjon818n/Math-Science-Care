/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Student,
  AttendanceRecord,
  Folder,
  Question,
  CustomDocument,
  SlidePresentation,
  ActivityLog,
  AppSettings,
  ActivityType,
  StudentStatus,
  Exam,
  ExamResult,
  UploadedFile,
  FeePayment,
  SmsLog,
} from '../types';
import { StorageManager } from '../lib/storage';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  currentSection: string;
  setCurrentSection: (section: string) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  students: Student[];
  refreshStudents: () => void;
  addStudent: (s: Omit<Student, 'id'>) => Student;
  updateStudent: (s: Student) => void;
  deleteStudent: (id: string) => void;
  duplicateStudent: (id: string) => void;
  bulkDeleteStudents: (ids: string[]) => void;
  attendance: AttendanceRecord[];
  saveAttendanceRecords: (date: string, records: Omit<AttendanceRecord, 'id' | 'timestamp'>[]) => void;
  folders: Folder[];
  addFolder: (name: string, type: 'question' | 'document', parentId: string | null) => void;
  questions: Question[];
  addQuestion: (q: Omit<Question, 'id' | 'createdAt'>) => Question;
  updateQuestion: (q: Question) => void;
  deleteQuestion: (id: string) => void;
  duplicateQuestion: (id: string) => void;
  documents: CustomDocument[];
  addDocument: (d: Omit<CustomDocument, 'id' | 'lastEdited'>) => CustomDocument;
  updateDocument: (d: CustomDocument) => void;
  deleteDocument: (id: string) => void;
  presentations: SlidePresentation[];
  addPresentation: (p: Omit<SlidePresentation, 'id' | 'lastEdited'>) => SlidePresentation;
  updatePresentation: (p: SlidePresentation) => void;
  deletePresentation: (id: string) => void;
  exams: Exam[];
  examResults: ExamResult[];
  addExam: (e: Omit<Exam, 'id'>) => Exam;
  updateExam: (e: Exam) => void;
  deleteExam: (id: string) => void;
  saveExamResults: (examId: string, results: Omit<ExamResult, 'id'>[]) => void;
  uploadedFiles: UploadedFile[];
  addUploadedFile: (file: Omit<UploadedFile, 'id' | 'uploadedAt'>) => void;
  deleteUploadedFile: (id: string) => void;
  uploadFileToServer: (fileName: string, fileData: string) => Promise<{ success: boolean; url?: string; size?: number; error?: string }>;
  feePayments: FeePayment[];
  updateFeePayments: (updated: FeePayment[]) => Promise<boolean>;
  smsLogs: SmsLog[];
  addSmsLog: (log: Omit<SmsLog, 'id' | 'created_at'>) => void;
  activities: ActivityLog[];
  logAction: (module: string, action: string, details: string, type?: ActivityType) => void;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  resetAllData: () => void;
  // Auth gates
  adminPassword: string;
  setAdminPassword: (pw: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentSection, setCurrentSection] = useState<string>('Dashboard');
  const [settings, setSettings] = useState<AppSettings>(() => StorageManager.getSettings());
  const [students, setStudents] = useState<Student[]>(() => StorageManager.getStudents());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageManager.getAttendance());
  const [folders, setFolders] = useState<Folder[]>(() => StorageManager.getFolders());
  const [questions, setQuestions] = useState<Question[]>(() => StorageManager.getQuestions());
  const [documents, setDocuments] = useState<CustomDocument[]>(() => StorageManager.getDocuments());
  const [presentations, setPresentations] = useState<SlidePresentation[]>(() => StorageManager.getPresentations());
  const [exams, setExams] = useState<Exam[]>(() => StorageManager.getExams());
  const [examResults, setExamResults] = useState<ExamResult[]>(() => StorageManager.getExamResults());
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(() => StorageManager.getUploadedFiles());
  const [feePayments, setFeePayments] = useState<FeePayment[]>(() => StorageManager.getFeePayments());
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>(() => StorageManager.getSmsLogs());
  const [activities, setActivities] = useState<ActivityLog[]>(() => StorageManager.getActivities());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Unique client ID to prevent self-echoes from Server-Sent Events sync
  const clientId = useMemo(() => 'client-' + Math.random().toString(36).substr(2, 9), []);

  const [adminPassword, setAdminPasswordState] = useState<string>('');

  // Strict Security: Force lock / require password on every single reload or new tab
  useEffect(() => {
    // Immediate clean-up on mount/reload to prevent persistent logins
    sessionStorage.removeItem('msc_admin_auth');
    localStorage.removeItem('msc_admin_auth'); // Clean up old localStorage if present
    setAdminPasswordState('');

    const handleBeforeUnload = () => {
      sessionStorage.removeItem('msc_admin_auth');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const setAdminPassword = (pw: string) => {
    setAdminPasswordState(pw);
    if (pw) {
      sessionStorage.setItem('msc_admin_auth', pw);
    } else {
      sessionStorage.removeItem('msc_admin_auth');
    }
  };

  const logout = () => {
    setAdminPassword('');
  };

  // Setup Socket.IO real-time bi-directional sync with Node server
  useEffect(() => {
    if (!adminPassword) return;

    // 1. Fetch initial state from database on server
    const loadInitialData = async () => {
      try {
        const res = await fetch(`/api/data?auth=${adminPassword}`);
        if (res.ok) {
          const data = await res.json();
          
          const localStudents = StorageManager.getStudents();
          const localFeePayments = StorageManager.getFeePayments();
          const localQuestions = StorageManager.getQuestions();
          const localDocuments = StorageManager.getDocuments();

          const serverStudents = data.students || [];
          const serverFeePayments = data.feePayments || [];

          // Server is considered "freshly initialized or reset" if students & feePayments lists are empty,
          // but the client already has active browsed data (students, payments, or documents).
          const isServerFresh = serverStudents.length === 0 && serverFeePayments.length === 0;
          const clientHasData = localStudents.length > 0 || localFeePayments.length > 0 || (localDocuments && localDocuments.length > 0);

          if (isServerFresh && clientHasData) {
            console.log("Detecting fresh or reset server database. Syncing active client data to server to prevent data loss.");
            
            const localAttendance = StorageManager.getAttendance();
            const localFolders = StorageManager.getFolders();
            const localPresentations = StorageManager.getPresentations();
            const localExams = StorageManager.getExams();
            const localExamResults = StorageManager.getExamResults();
            const localActivities = StorageManager.getActivities();
            const localSettings = StorageManager.getSettings();
            const localUploadedFiles = StorageManager.getUploadedFiles();

            const localSmsLogs = StorageManager.getSmsLogs();

            // Push all client-side collections to server sequentially
            await syncToServer('students', localStudents);
            await syncToServer('attendance', localAttendance);
            await syncToServer('folders', localFolders);
            await syncToServer('questions', localQuestions);
            await syncToServer('documents', localDocuments);
            await syncToServer('presentations', localPresentations);
            await syncToServer('exams', localExams);
            await syncToServer('examResults', localExamResults);
            await syncToServer('activities', localActivities);
            await syncToServer('settings', localSettings);
            await syncToServer('uploadedFiles', localUploadedFiles);
            await syncToServer('feePayments', localFeePayments);
            await syncToServer('sms_logs', localSmsLogs);
            
            // Set state to ensure react components are fully up-to-date
            setStudents(localStudents);
            setAttendance(localAttendance);
            setFolders(localFolders);
            setQuestions(localQuestions);
            setDocuments(localDocuments);
            setPresentations(localPresentations);
            setExams(localExams);
            setExamResults(localExamResults);
            setActivities(localActivities);
            setSettings(localSettings);
            setUploadedFiles(localUploadedFiles);
            setFeePayments(localFeePayments);
            setSmsLogs(localSmsLogs);
            showToast("Restored all browsed data to server successfully", "success");
          } else {
            // Normal behavior: server contains the data, or both are empty. Server is the source of truth.
            if (data.students) { setStudents(data.students); StorageManager.saveStudents(data.students); }
            if (data.attendance) { setAttendance(data.attendance); StorageManager.saveAttendance(data.attendance); }
            if (data.folders) { setFolders(data.folders); StorageManager.saveFolders(data.folders); }
            if (data.questions) { setQuestions(data.questions); StorageManager.saveQuestions(data.questions); }
            if (data.documents) { setDocuments(data.documents); StorageManager.saveDocuments(data.documents); }
            if (data.presentations) { setPresentations(data.presentations); StorageManager.savePresentations(data.presentations); }
            if (data.exams) { setExams(data.exams); StorageManager.saveExams(data.exams); }
            if (data.examResults) { setExamResults(data.examResults); StorageManager.saveExamResults(data.examResults); }
            if (data.activities) { setActivities(data.activities); StorageManager.saveActivities(data.activities); }
            if (data.settings) { setSettings(data.settings); StorageManager.saveSettings(data.settings); }
            if (data.uploadedFiles) { setUploadedFiles(data.uploadedFiles); StorageManager.saveUploadedFiles(data.uploadedFiles); }
            if (data.feePayments) { setFeePayments(data.feePayments); StorageManager.saveFeePayments(data.feePayments); }
            if (data.sms_logs) { setSmsLogs(data.sms_logs); StorageManager.saveSmsLogs(data.sms_logs); }
          }
        }
      } catch (e) {
        console.error("Failed to load database from server:", e);
      }
    };
    loadInitialData();

    // Helper for applying real-time data deltas
    const applyDelta = (key: string, data: any) => {
      switch (key) {
        case 'students':
          setStudents(data);
          StorageManager.saveStudents(data);
          break;
        case 'attendance':
          setAttendance(data);
          StorageManager.saveAttendance(data);
          break;
        case 'folders':
          setFolders(data);
          StorageManager.saveFolders(data);
          break;
        case 'questions':
          setQuestions(data);
          StorageManager.saveQuestions(data);
          break;
        case 'documents':
          setDocuments(data);
          StorageManager.saveDocuments(data);
          break;
        case 'presentations':
          setPresentations(data);
          StorageManager.savePresentations(data);
          break;
        case 'exams':
          setExams(data);
          StorageManager.saveExams(data);
          break;
        case 'examResults':
          setExamResults(data);
          StorageManager.saveExamResults(data);
          break;
        case 'activities':
          setActivities(data);
          StorageManager.saveActivities(data);
          break;
        case 'settings':
          setSettings(data);
          StorageManager.saveSettings(data);
          break;
        case 'uploadedFiles':
          setUploadedFiles(data);
          StorageManager.saveUploadedFiles(data);
          break;
        case 'feePayments':
          setFeePayments(data);
          StorageManager.saveFeePayments(data);
          break;
        case 'sms_logs':
          setSmsLogs(data);
          StorageManager.saveSmsLogs(data);
          break;
        default:
          break;
      }
    };

    // 2. Setup Socket.IO real-time bi-directional connection
    let socket: Socket | null = null;
    try {
      socket = io({
        transports: ['websocket', 'polling'],
        query: { auth: adminPassword, clientId }
      });

      socket.emit('join');

      socket.on('data:update', (payload: any) => {
        if (!payload || payload.clientId === clientId) return;
        applyDelta(payload.key, payload.data);
      });

      socket.on('data:reset', (payload: any) => {
        if (!payload || payload.clientId === clientId) return;
        window.location.reload();
      });
    } catch (err) {
      console.warn("Socket.IO client initialization skipped:", err);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [adminPassword, clientId]);

  // Push updates back to Node/Express server for persistence and broadcast
  const syncToServer = async (key: string, data: any) => {
    if (!adminPassword) return;
    try {
      await fetch(`/api/data?auth=${adminPassword}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify({ key, data, clientId }),
      });
    } catch (err) {
      console.error(`Failed to sync updates to server for ${key}:`, err);
    }
  };

  // Apply dark mode setting to HTML class list
  useEffect(() => {
    const html = document.documentElement;
    if (settings.darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [settings.darkMode]);


  const runAutoInactivityCheck = (currentStudents: Student[], currentAttendance: AttendanceRecord[]) => {
    const today = new Date();
    
    // Last 7 calendar days
    const last7Days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      last7Days.push(`${yyyy}-${mm}-${dd}`);
    }

    // Filter to on-days (NOT Friday (5), NOT Saturday (6))
    const last7OnDays = last7Days.filter((dateStr) => {
      const parts = dateStr.split('-');
      const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const dayOfWeek = dateObj.getDay();
      return dayOfWeek !== 5 && dayOfWeek !== 6;
    });

    // Class dates actually held (at least one attendance record across any student on that date)
    const activeClassDates = last7OnDays.filter(dateStr => 
      currentAttendance.some(att => att.date === dateStr)
    );

    if (activeClassDates.length === 0) return;

    let updatedAny = false;
    const updatedStudents = currentStudents.map((student) => {
      if (student.status !== StudentStatus.Active) return student;

      // Check attendance for this student on each of the active class dates
      let attendedAny = false;
      let hasRecord = false;

      activeClassDates.forEach((dateStr) => {
        const rec = currentAttendance.find(att => att.studentId === student.id && att.date === dateStr);
        if (rec) {
          hasRecord = true;
          if (rec.status === 'Present' || rec.status === 'Late' || rec.status === 'Leave') {
            attendedAny = true;
          }
        }
      });

      // If they had class held but didn't attend any (Present, Late, or Leave)
      if (hasRecord && !attendedAny) {
        updatedAny = true;
        logAction(
          'Students',
          'Auto Deactivated',
          `Marked ${student.name} as Inactive due to 1 week of consecutive absence on active class days.`,
          ActivityType.Warning
        );
        showToast(`${student.name} marked Inactive due to 1 week of absence.`, 'warning');
        return {
          ...student,
          status: StudentStatus.Inactive,
          notes: `${student.notes ? student.notes + ' \n' : ''}[System Auto]: Marked Inactive due to 1 week absence.`,
        };
      }
      return student;
    });

    if (updatedAny) {
      setStudents(updatedStudents);
      StorageManager.saveStudents(updatedStudents);
      syncToServer('students', updatedStudents);
    }
  };

  // Run inactivity check on mount once database is loaded
  useEffect(() => {
    if (students.length > 0 && attendance.length > 0) {
      runAutoInactivityCheck(students, attendance);
    }
  }, []);

  // Secure Automatic Orphan Cleanup: Purge any attendance or fee payments for non-existent students
  useEffect(() => {
    if (students.length === 0) {
      if (attendance.length > 0) {
        setAttendance([]);
        StorageManager.saveAttendance([]);
        syncToServer('attendance', []);
      }
      if (feePayments.length > 0) {
        setFeePayments([]);
        StorageManager.saveFeePayments([]);
        syncToServer('feePayments', []);
      }
    } else {
      const studentIds = new Set(students.map((s) => s.id));
      const hasOrphanedAttendance = attendance.some((a) => !studentIds.has(a.studentId));
      const hasOrphanedPayments = feePayments.some((p) => !studentIds.has(p.studentId));

      if (hasOrphanedAttendance || hasOrphanedPayments) {
        if (hasOrphanedAttendance) {
          const cleanAttendance = attendance.filter((a) => studentIds.has(a.studentId));
          setAttendance(cleanAttendance);
          StorageManager.saveAttendance(cleanAttendance);
          syncToServer('attendance', cleanAttendance);
        }
        if (hasOrphanedPayments) {
          const cleanPayments = feePayments.filter((p) => studentIds.has(p.studentId));
          setFeePayments(cleanPayments);
          StorageManager.saveFeePayments(cleanPayments);
          syncToServer('feePayments', cleanPayments);
        }
      }
    }
  }, [students]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = 'toast-' + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    StorageManager.saveSettings(updated);
    showToast('Settings saved successfully', 'success');
    syncToServer('settings', updated);
  };

  const refreshStudents = () => {
    setStudents(StorageManager.getStudents());
  };

  const logAction = (module: string, action: string, details: string, type: ActivityType = ActivityType.Info) => {
    StorageManager.addActivity(module, action, details, type);
    const updated = StorageManager.getActivities();
    setActivities(updated);
    syncToServer('activities', updated);
  };

  // Student Actions
  const addStudent = (s: Omit<Student, 'id'>) => {
    const id = 's-' + (students.length > 0 ? Math.max(...students.map(std => {
      const parsed = parseInt(std.id.replace('s-', ''), 10);
      return isNaN(parsed) ? 0 : parsed;
    })) + 1 : 1);
    const newStudent: Student = { ...s, id };
    const updated = [...students, newStudent];
    setStudents(updated);
    StorageManager.saveStudents(updated);
    logAction('Students', 'Student Added', `${newStudent.name} (Roll ${newStudent.roll}) has been added.`, ActivityType.Success);
    showToast(`${newStudent.name} added successfully!`);
    syncToServer('students', updated);
    return newStudent;
  };

  const updateStudent = (s: Student) => {
    const updated = students.map((std) => (std.id === s.id ? s : std));
    setStudents(updated);
    StorageManager.saveStudents(updated);
    logAction('Students', 'Student Edited', `Updated details for student: ${s.name}.`, ActivityType.Info);
    showToast(`Updated details for ${s.name}`);
    syncToServer('students', updated);
  };

  const deleteStudent = (id: string) => {
    const student = students.find((std) => std.id === id);
    if (!student) return;
    const updated = students.filter((std) => std.id !== id);
    setStudents(updated);
    StorageManager.saveStudents(updated);
    // Also clear references in attendance
    const filteredAttendance = attendance.filter((a) => a.studentId !== id);
    setAttendance(filteredAttendance);
    StorageManager.saveAttendance(filteredAttendance);

    // Also clear references in fee payments
    const filteredFeePayments = feePayments.filter((p) => p.studentId !== id);
    setFeePayments(filteredFeePayments);
    StorageManager.saveFeePayments(filteredFeePayments);

    logAction('Students', 'Student Deleted', `Removed student: ${student.name}.`, ActivityType.Danger);
    showToast(`Removed student ${student.name}`, 'warning');
    syncToServer('students', updated);
    syncToServer('attendance', filteredAttendance);
    syncToServer('feePayments', filteredFeePayments);
  };

  const duplicateStudent = (id: string) => {
    const original = students.find((std) => std.id === id);
    if (!original) return;
    const maxRoll = students.length > 0 ? Math.max(...students.map(s => s.roll)) : 0;
    const newStudent: Omit<Student, 'id'> = {
      ...original,
      name: `${original.name} (Copy)`,
      roll: maxRoll + 1,
    };
    addStudent(newStudent);
  };

  const bulkDeleteStudents = (ids: string[]) => {
    const updated = students.filter((std) => !ids.includes(std.id));
    setStudents(updated);
    StorageManager.saveStudents(updated);
    // Clean up attendance
    const filteredAttendance = attendance.filter((a) => !ids.includes(a.studentId));
    setAttendance(filteredAttendance);
    StorageManager.saveAttendance(filteredAttendance);

    // Clean up fee payments
    const filteredFeePayments = feePayments.filter((p) => !ids.includes(p.studentId));
    setFeePayments(filteredFeePayments);
    StorageManager.saveFeePayments(filteredFeePayments);

    logAction('Students', 'Bulk Delete', `Deleted ${ids.length} students in a bulk operation.`, ActivityType.Danger);
    showToast(`Successfully deleted ${ids.length} students`, 'warning');
    syncToServer('students', updated);
    syncToServer('attendance', filteredAttendance);
    syncToServer('feePayments', filteredFeePayments);
  };

  // Attendance Actions
  const saveAttendanceRecords = (date: string, records: Omit<AttendanceRecord, 'id' | 'timestamp'>[]) => {
    const studentIdsBeingSaved = new Set(records.map(r => r.studentId));
    let currentFiltered = attendance.filter((rec) => !(rec.date === date && studentIdsBeingSaved.has(rec.studentId)));
    const timestamp = new Date().toISOString();
    
    const newRecords: AttendanceRecord[] = records.map((rec, index) => ({
      ...rec,
      id: `att-${Date.now()}-${index}`,
      timestamp,
    }));

    const updated = [...currentFiltered, ...newRecords];
    setAttendance(updated);
    StorageManager.saveAttendance(updated);
    logAction('Attendance', 'Attendance Saved', `Saved ${records.length} student attendance logs for date: ${date}.`, ActivityType.Success);
    showToast(`Attendance logs saved for ${date}!`);
    syncToServer('attendance', updated);

    runAutoInactivityCheck(students, updated);
  };

  // Folders
  const addFolder = (name: string, type: 'question' | 'document', parentId: string | null) => {
    const id = 'f-' + Date.now();
    const newFolder: Folder = { id, name, type, parentId };
    const updated = [...folders, newFolder];
    setFolders(updated);
    StorageManager.saveFolders(updated);
    logAction('System', 'Folder Created', `Created ${type} folder: "${name}".`, ActivityType.Info);
    showToast(`Folder "${name}" created`);
    syncToServer('folders', updated);
  };

  // Questions
  const addQuestion = (q: Omit<Question, 'id' | 'createdAt'>) => {
    const id = 'q-' + Date.now();
    const newQuestion: Question = {
      ...q,
      id,
      createdAt: new Date().toISOString(),
    };
    const updated = [newQuestion, ...questions];
    setQuestions(updated);
    StorageManager.saveQuestions(updated);
    logAction('Question Bank', 'Question Created', `Created question: "${q.title}".`, ActivityType.Success);
    showToast(`Question "${q.title}" added to repository!`);
    syncToServer('questions', updated);
    return newQuestion;
  };

  const updateQuestion = (q: Question) => {
    const updated = questions.map((item) => (item.id === q.id ? q : item));
    setQuestions(updated);
    StorageManager.saveQuestions(updated);
    logAction('Question Bank', 'Question Updated', `Updated question details for: "${q.title}".`, ActivityType.Info);
    showToast(`Question "${q.title}" updated`);
    syncToServer('questions', updated);
  };

  const deleteQuestion = (id: string) => {
    const question = questions.find((q) => q.id === id);
    if (!question) return;
    const updated = questions.filter((q) => q.id !== id);
    setQuestions(updated);
    StorageManager.saveQuestions(updated);
    logAction('Question Bank', 'Question Deleted', `Removed question: "${question.title}".`, ActivityType.Danger);
    showToast(`Removed "${question.title}"`, 'warning');
    syncToServer('questions', updated);
  };

  const duplicateQuestion = (id: string) => {
    const original = questions.find((q) => q.id === id);
    if (!original) return;
    const { id: _, createdAt: __, ...rest } = original;
    const duplicated: Omit<Question, 'id' | 'createdAt'> = {
      ...rest,
      title: `${original.title} (Copy)`,
    };
    addQuestion(duplicated);
  };

  // Documents
  const addDocument = (d: Omit<CustomDocument, 'id' | 'lastEdited'>) => {
    const id = 'd-' + Date.now();
    const newDoc: CustomDocument = {
      ...d,
      id,
      lastEdited: new Date().toISOString(),
    };
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    StorageManager.saveDocuments(updated);
    logAction('Documents', 'Document Created', `Created text document: "${d.title}".`, ActivityType.Success);
    showToast(`Document "${d.title}" created successfully!`);
    syncToServer('documents', updated);
    return newDoc;
  };

  const updateDocument = (d: CustomDocument) => {
    const updatedDoc = { ...d, lastEdited: new Date().toISOString() };
    const updated = documents.map((item) => (item.id === d.id ? updatedDoc : item));
    setDocuments(updated);
    StorageManager.saveDocuments(updated);
    logAction('Documents', 'Document Autosaved', `Saved changes for doc: "${d.title}".`, ActivityType.Info);
    syncToServer('documents', updated);
  };

  const deleteDocument = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    StorageManager.saveDocuments(updated);
    logAction('Documents', 'Document Deleted', `Removed document: "${doc.title}".`, ActivityType.Danger);
    showToast(`Removed "${doc.title}"`, 'warning');
    syncToServer('documents', updated);
  };

  // Slide Presentations
  const addPresentation = (p: Omit<SlidePresentation, 'id' | 'lastEdited'>) => {
    const id = 'p-' + Date.now();
    const newPresentation: SlidePresentation = {
      ...p,
      id,
      lastEdited: new Date().toISOString(),
    };
    const updated = [newPresentation, ...presentations];
    setPresentations(updated);
    StorageManager.savePresentations(updated);
    logAction('Slides', 'Slide Deck Created', `Created presentation: "${p.title}".`, ActivityType.Success);
    showToast(`Slide Deck "${p.title}" created!`);
    syncToServer('presentations', updated);
    return newPresentation;
  };

  const updatePresentation = (p: SlidePresentation) => {
    const updatedPres = { ...p, lastEdited: new Date().toISOString() };
    const updated = presentations.map((item) => (item.id === p.id ? updatedPres : item));
    setPresentations(updated);
    StorageManager.savePresentations(updated);
    logAction('Slides', 'Presentation Saved', `Updated slide deck: "${p.title}".`, ActivityType.Info);
    syncToServer('presentations', updated);
  };

  const deletePresentation = (id: string) => {
    const pres = presentations.find((p) => p.id === id);
    if (!pres) return;
    const updated = presentations.filter((p) => p.id !== id);
    setPresentations(updated);
    StorageManager.savePresentations(updated);
    logAction('Slides', 'Presentation Deleted', `Removed presentation: "${pres.title}".`, ActivityType.Danger);
    showToast(`Removed "${pres.title}"`, 'warning');
    syncToServer('presentations', updated);
  };

  // Exam Actions
  const addExam = (e: Omit<Exam, 'id'>) => {
    const id = 'exam-' + Date.now();
    const newExam: Exam = { ...e, id };
    const updated = [newExam, ...exams];
    setExams(updated);
    StorageManager.saveExams(updated);
    logAction('Exam Portal', 'Exam Created', `Created exam: "${e.name}" of type ${e.type}.`, ActivityType.Success);
    showToast(`Exam "${e.name}" added successfully!`);
    syncToServer('exams', updated);
    return newExam;
  };

  const updateExam = (e: Exam) => {
    const updated = exams.map((item) => (item.id === e.id ? e : item));
    setExams(updated);
    StorageManager.saveExams(updated);
    logAction('Exam Portal', 'Exam Updated', `Updated details for exam: "${e.name}".`, ActivityType.Info);
    showToast(`Updated details for "${e.name}"`);
    syncToServer('exams', updated);
  };

  const deleteExam = (id: string) => {
    const exam = exams.find((e) => e.id === id);
    if (!exam) return;
    const updatedExams = exams.filter((e) => e.id !== id);
    setExams(updatedExams);
    StorageManager.saveExams(updatedExams);
    
    // Also clean up related exam results
    const updatedResults = examResults.filter((r) => r.examId !== id);
    setExamResults(updatedResults);
    StorageManager.saveExamResults(updatedResults);

    logAction('Exam Portal', 'Exam Deleted', `Removed exam: "${exam.name}".`, ActivityType.Danger);
    showToast(`Removed exam "${exam.name}"`, 'warning');
    syncToServer('exams', updatedExams);
    syncToServer('examResults', updatedResults);
  };

  const saveExamResults = (examId: string, results: Omit<ExamResult, 'id'>[]) => {
    const currentFiltered = examResults.filter((r) => r.examId !== examId);
    
    const newResults: ExamResult[] = results.map((r, index) => ({
      ...r,
      id: `res-${examId}-${Date.now()}-${index}`,
    }));

    const updated = [...currentFiltered, ...newResults];
    setExamResults(updated);
    StorageManager.saveExamResults(updated);
    
    const exam = exams.find(e => e.id === examId);
    logAction('Exam Portal', 'Results Saved', `Saved marks/results for ${results.length} students in exam: "${exam?.name || examId}".`, ActivityType.Success);
    showToast(`Results saved for "${exam?.name || 'Exam'}"!`);
    syncToServer('examResults', updated);
  };

  // Uploaded Files Actions
  const addUploadedFile = (file: Omit<UploadedFile, 'id' | 'uploadedAt'>) => {
    const id = 'file-' + Date.now();
    const newFile: UploadedFile = {
      ...file,
      id,
      uploadedAt: new Date().toISOString(),
    };
    const updated = [newFile, ...uploadedFiles];
    setUploadedFiles(updated);
    StorageManager.saveUploadedFiles(updated);
    logAction('Document Manager', 'File Uploaded', `Registered document: "${file.name}" to database.`, ActivityType.Success);
    showToast(`File "${file.name}" registered!`);
    syncToServer('uploadedFiles', updated);
  };

  const deleteUploadedFile = (id: string) => {
    const file = uploadedFiles.find((f) => f.id === id);
    if (!file) return;
    const updated = uploadedFiles.filter((f) => f.id !== id);
    setUploadedFiles(updated);
    StorageManager.saveUploadedFiles(updated);
    logAction('Document Manager', 'File Deleted', `Removed document record: "${file.name}".`, ActivityType.Danger);
    showToast(`Removed file "${file.name}"`, 'warning');
    syncToServer('uploadedFiles', updated);
  };

  const uploadFileToServer = async (fileName: string, fileData: string): Promise<{ success: boolean; url?: string; size?: number; error?: string }> => {
    try {
      const res = await fetch(`/api/upload?auth=${adminPassword}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify({ fileName, fileData }),
      });
      if (res.ok) {
        const result = await res.json();
        return { success: true, url: result.url, size: result.size };
      } else {
        const errorData = await res.json();
        return { success: false, error: errorData.error || 'Failed to upload' };
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      return { success: false, error: err.message || 'Network error uploading file' };
    }
  };

  const resetAllData = async () => {
    if (adminPassword) {
      try {
        await fetch(`/api/reset?auth=${adminPassword}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': adminPassword,
          },
          body: JSON.stringify({ clientId }),
        });
        window.location.reload();
      } catch (e) {
        StorageManager.resetDatabase();
      }
    } else {
      StorageManager.resetDatabase();
    }
  };

  const updateFeePayments = async (updated: FeePayment[]): Promise<boolean> => {
    // Validate constraint client-side first
    for (const oldPay of feePayments) {
      if (oldPay.status === 'Paid') {
        const incoming = updated.find(p => p.id === oldPay.id);
        if (!incoming) {
          showToast('Strict Security Constraint: Locked payments cannot be deleted.', 'error');
          return false;
        }
        if (
          incoming.status !== 'Paid' ||
          incoming.amount !== oldPay.amount ||
          incoming.paidAmount !== oldPay.paidAmount ||
          incoming.paymentDate !== oldPay.paymentDate ||
          incoming.studentId !== oldPay.studentId ||
          incoming.month !== oldPay.month
        ) {
          showToast('Strict Security Constraint: Locked payments cannot be modified.', 'error');
          return false;
        }
      }
    }

    setFeePayments(updated);
    StorageManager.saveFeePayments(updated);

    try {
      const res = await fetch(`/api/data?auth=${adminPassword}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify({ key: 'feePayments', data: updated, clientId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Server error updating fee payments');
      }
      return true;
    } catch (e: any) {
      console.error('Failed to update fee payments on server:', e);
      const reverted = StorageManager.getFeePayments();
      setFeePayments(reverted);
      showToast(`Sync Error: ${e.message || 'Could not sync with server.'}`, 'error');
      return false;
    }
  };

  const addSmsLog = (log: Omit<SmsLog, 'id' | 'created_at'>) => {
    const id = 'sms-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const newLog: SmsLog = {
      ...log,
      id,
      created_at: new Date().toISOString(),
    };
    setSmsLogs((prev) => {
      const updated = [newLog, ...prev];
      StorageManager.saveSmsLogs(updated);
      
      // Sync with Node backend database.json
      fetch(`/api/data?auth=${adminPassword}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify({ key: 'sms_logs', data: updated, clientId }),
      }).catch(err => {
        console.error('Failed to sync sms log to server:', err);
      });

      return updated;
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentSection,
        setCurrentSection,
        settings,
        updateSettings,
        students,
        refreshStudents,
        addStudent,
        updateStudent,
        deleteStudent,
        duplicateStudent,
        bulkDeleteStudents,
        attendance,
        saveAttendanceRecords,
        folders,
        addFolder,
        questions,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        duplicateQuestion,
        documents,
        addDocument,
        updateDocument,
        deleteDocument,
        presentations,
        addPresentation,
        updatePresentation,
        deletePresentation,
        exams,
        examResults,
        addExam,
        updateExam,
        deleteExam,
        saveExamResults,
        uploadedFiles,
        addUploadedFile,
        deleteUploadedFile,
        uploadFileToServer,
        feePayments,
        updateFeePayments,
        smsLogs,
        addSmsLog,
        activities,
        logAction,
        toasts,
        showToast,
        removeToast,
        resetAllData,
        // Auth gate states
        adminPassword,
        setAdminPassword,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
