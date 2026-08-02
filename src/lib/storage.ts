/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Student,
  AttendanceRecord,
  Folder,
  Question,
  CustomDocument,
  SlidePresentation,
  ActivityLog,
  ActivityType,
  AppSettings,
  Exam,
  ExamResult,
  UploadedFile,
  FeePayment,
  SmsLog
} from '../types';
import { saveCollectionToSupabase, fetchAllDataFromSupabase } from './supabase';

const KEYS = {
  STUDENTS: 'msc_students',
  ATTENDANCE: 'msc_attendance',
  FOLDERS: 'msc_folders',
  QUESTIONS: 'msc_questions',
  DOCUMENTS: 'msc_documents',
  PRESENTATIONS: 'msc_presentations',
  ACTIVITIES: 'msc_activities',
  SETTINGS: 'msc_settings',
  EXAMS: 'msc_exams',
  EXAM_RESULTS: 'msc_exam_results',
  UPLOADED_FILES: 'msc_uploaded_files',
  FEE_PAYMENTS: 'msc_fee_payments',
  SMS_LOGS: 'msc_sms_logs',
};

// Initial Defaults for fresh local state cache
const INITIAL_FOLDERS: Folder[] = [
  { id: 'f-1', name: 'Mathematics Core', type: 'question', parentId: null },
  { id: 'f-2', name: 'Science Mechanics & Light', type: 'question', parentId: null },
  { id: 'f-3', name: 'General Science Questions', type: 'question', parentId: null },
  { id: 'f-4', name: 'Exam Sheets 2026', type: 'document', parentId: null },
  { id: 'f-5', name: 'Lecture Modules', type: 'document', parentId: null },
];

const INITIAL_SETTINGS: AppSettings = {
  instituteName: 'Math & Science Care',
  logoUrl: '/app_logo.jpg',
  themeAccent: 'emerald',
  darkMode: true,
  customFooterText: 'Cared by: Nion Hassan Nirjon',
  autoSaveInterval: 10,
  smsServiceEnabled: true,
};

// Local cache helpers
function loadData<T>(key: string, defaultData: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultData;
    return JSON.parse(stored) as T;
  } catch (e) {
    return defaultData;
  }
}

function saveData<T>(key: string, data: T, supabaseKey?: string): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // Ignore quota or disabled localStorage errors
  }
  if (supabaseKey) {
    saveCollectionToSupabase(supabaseKey, data).catch(() => {
      // Ignore optional Supabase sync errors
    });
  }
}

// Global CRUD Helpers API backed by Supabase
export const StorageManager = {
  getStudents: (): Student[] => loadData<Student[]>(KEYS.STUDENTS, []),
  saveStudents: (data: Student[]) => saveData<Student[]>(KEYS.STUDENTS, data, 'students'),

  getAttendance: (): AttendanceRecord[] => loadData<AttendanceRecord[]>(KEYS.ATTENDANCE, []),
  saveAttendance: (data: AttendanceRecord[]) => saveData<AttendanceRecord[]>(KEYS.ATTENDANCE, data, 'attendance'),

  getFolders: (): Folder[] => loadData<Folder[]>(KEYS.FOLDERS, INITIAL_FOLDERS),
  saveFolders: (data: Folder[]) => saveData<Folder[]>(KEYS.FOLDERS, data, 'folders'),

  getQuestions: (): Question[] => loadData<Question[]>(KEYS.QUESTIONS, []),
  saveQuestions: (data: Question[]) => saveData<Question[]>(KEYS.QUESTIONS, data, 'questions'),

  getDocuments: (): CustomDocument[] => loadData<CustomDocument[]>(KEYS.DOCUMENTS, []),
  saveDocuments: (data: CustomDocument[]) => saveData<CustomDocument[]>(KEYS.DOCUMENTS, data, 'documents'),

  getPresentations: (): SlidePresentation[] => loadData<SlidePresentation[]>(KEYS.PRESENTATIONS, []),
  savePresentations: (data: SlidePresentation[]) => saveData<SlidePresentation[]>(KEYS.PRESENTATIONS, data, 'presentations'),

  getActivities: (): ActivityLog[] => loadData<ActivityLog[]>(KEYS.ACTIVITIES, []),
  saveActivities: (data: ActivityLog[]) => saveData<ActivityLog[]>(KEYS.ACTIVITIES, data, 'activities'),
  addActivity: (module: string, action: string, details: string, type: ActivityType = ActivityType.Info) => {
    const logs = StorageManager.getActivities();
    const newLog: ActivityLog = {
      id: 'act-' + Date.now(),
      timestamp: new Date().toISOString(),
      module,
      action,
      details,
      type,
    };
    StorageManager.saveActivities([newLog, ...logs]);
  },

  getSettings: (): AppSettings => loadData<AppSettings>(KEYS.SETTINGS, INITIAL_SETTINGS),
  saveSettings: (data: AppSettings) => saveData<AppSettings>(KEYS.SETTINGS, data, 'settings'),

  getExams: (): Exam[] => loadData<Exam[]>(KEYS.EXAMS, []),
  saveExams: (data: Exam[]) => saveData<Exam[]>(KEYS.EXAMS, data, 'exams'),

  getExamResults: (): ExamResult[] => loadData<ExamResult[]>(KEYS.EXAM_RESULTS, []),
  saveExamResults: (data: ExamResult[]) => saveData<ExamResult[]>(KEYS.EXAM_RESULTS, data, 'examResults'),

  getUploadedFiles: (): UploadedFile[] => loadData<UploadedFile[]>(KEYS.UPLOADED_FILES, []),
  saveUploadedFiles: (data: UploadedFile[]) => saveData<UploadedFile[]>(KEYS.UPLOADED_FILES, data, 'uploadedFiles'),

  getFeePayments: (): FeePayment[] => loadData<FeePayment[]>(KEYS.FEE_PAYMENTS, []),
  saveFeePayments: (data: FeePayment[]) => saveData<FeePayment[]>(KEYS.FEE_PAYMENTS, data, 'feePayments'),

  getSmsLogs: (): SmsLog[] => loadData<SmsLog[]>(KEYS.SMS_LOGS, []),
  saveSmsLogs: (data: SmsLog[]) => saveData<SmsLog[]>(KEYS.SMS_LOGS, data, 'sms_logs'),

  syncFromSupabase: async () => {
    try {
      const data = await fetchAllDataFromSupabase();
      if (data.students) StorageManager.saveStudents(data.students);
      if (data.attendance) StorageManager.saveAttendance(data.attendance);
      if (data.folders) StorageManager.saveFolders(data.folders);
      if (data.questions) StorageManager.saveQuestions(data.questions);
      if (data.documents) StorageManager.saveDocuments(data.documents);
      if (data.presentations) StorageManager.savePresentations(data.presentations);
      if (data.activities) StorageManager.saveActivities(data.activities);
      if (data.settings) StorageManager.saveSettings(data.settings);
      if (data.exams) StorageManager.saveExams(data.exams);
      if (data.examResults) StorageManager.saveExamResults(data.examResults);
      if (data.uploadedFiles) StorageManager.saveUploadedFiles(data.uploadedFiles);
      if (data.feePayments) StorageManager.saveFeePayments(data.feePayments);
      if (data.sms_logs) StorageManager.saveSmsLogs(data.sms_logs);
      return data;
    } catch (e) {
      return null;
    }
  },

  resetDatabase: () => {
    localStorage.clear();
    window.location.reload();
  },

  exportDatabase: (): string => {
    const backup = {
      students: StorageManager.getStudents(),
      attendance: StorageManager.getAttendance(),
      folders: StorageManager.getFolders(),
      questions: StorageManager.getQuestions(),
      documents: StorageManager.getDocuments(),
      presentations: StorageManager.getPresentations(),
      activities: StorageManager.getActivities(),
      settings: StorageManager.getSettings(),
      exams: StorageManager.getExams(),
      examResults: StorageManager.getExamResults(),
      uploadedFiles: StorageManager.getUploadedFiles(),
      feePayments: StorageManager.getFeePayments(),
      sms_logs: StorageManager.getSmsLogs(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importDatabase: (jsonStr: string): boolean => {
    try {
      const backup = JSON.parse(jsonStr);
      if (backup.students) StorageManager.saveStudents(backup.students);
      if (backup.attendance) StorageManager.saveAttendance(backup.attendance);
      if (backup.folders) StorageManager.saveFolders(backup.folders);
      if (backup.questions) StorageManager.saveQuestions(backup.questions);
      if (backup.documents) StorageManager.saveDocuments(backup.documents);
      if (backup.presentations) StorageManager.savePresentations(backup.presentations);
      if (backup.activities) StorageManager.saveActivities(backup.activities);
      if (backup.settings) StorageManager.saveSettings(backup.settings);
      if (backup.exams) StorageManager.saveExams(backup.exams);
      if (backup.examResults) StorageManager.saveExamResults(backup.examResults);
      if (backup.uploadedFiles) StorageManager.saveUploadedFiles(backup.uploadedFiles);
      if (backup.feePayments) StorageManager.saveFeePayments(backup.feePayments);
      if (backup.sms_logs) StorageManager.saveSmsLogs(backup.sms_logs);
      return true;
    } catch (e) {
      console.error('Error importing database backup', e);
      return false;
    }
  }
};
