/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import {
  Student,
  StudentStatus,
  AttendanceRecord,
  AttendanceStatus,
  Folder,
  Question,
  SubjectType,
  CustomDocument,
  SlidePresentation,
  ActivityLog,
  ActivityType,
  AppSettings,
  Exam,
  ExamResult,
  UploadedFile,
  FeePayment,
  SmsLog,
} from '../types';

// Read Environment Variables
const SUPABASE_URL = 
  import.meta.env?.VITE_SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL || 
  'https://hfwaxhcphvzoaygalljd.supabase.co';

const SUPABASE_ANON_KEY = 
  import.meta.env?.VITE_SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.anonkeyplaceholder';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// DATA MAPPERS (CamelCase <-> SnakeCase)
// ==========================================

export const mappers = {
  // Students
  studentToDb: (s: Student) => ({
    id: s.id,
    roll: s.roll || null,
    name: s.name,
    name_bangla: s.nameBangla || null,
    class_level: s.classLevel,
    group_name: s.groupName,
    batch: s.batch,
    batch_time: s.batchTime || null,
    school: s.school || null,
    school_roll: s.schoolRoll || null,
    parent_name: s.parentName || null,
    parent_phone: s.parentPhone || null,
    fathers_name: s.fathersName || null,
    fathers_phone: s.fathersPhone || null,
    mothers_name: s.mothersName || null,
    mothers_phone: s.mothersPhone || null,
    monthly_fee: s.monthlyFee || 0,
    admission_date: s.admissionDate || null,
    status: s.status || 'Active',
    notes: s.notes || '',
  }),
  dbToStudent: (row: any): Student => ({
    id: row.id,
    roll: row.roll ? Number(row.roll) : undefined,
    name: row.name || '',
    nameBangla: row.name_bangla || '',
    classLevel: row.class_level || '',
    groupName: row.group_name || '',
    batch: row.batch || '',
    batchTime: row.batch_time || '',
    school: row.school || '',
    schoolRoll: row.school_roll || '',
    parentName: row.parent_name || '',
    parentPhone: row.parent_phone || '',
    fathersName: row.fathers_name || '',
    fathersPhone: row.fathers_phone || '',
    mothersName: row.mothers_name || '',
    mothersPhone: row.mothers_phone || '',
    monthlyFee: Number(row.monthly_fee || 0),
    admissionDate: row.admission_date || '',
    status: (row.status as StudentStatus) || StudentStatus.Active,
    notes: row.notes || '',
  }),

  // Attendance
  attendanceToDb: (a: AttendanceRecord) => ({
    id: a.id,
    date: a.date,
    student_id: a.studentId,
    status: a.status,
    timestamp: a.timestamp,
  }),
  dbToAttendance: (row: any): AttendanceRecord => ({
    id: row.id,
    date: row.date,
    studentId: row.student_id,
    status: row.status as AttendanceStatus,
    timestamp: row.timestamp,
  }),

  // Folders
  folderToDb: (f: Folder) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    parent_id: f.parentId || null,
  }),
  dbToFolder: (row: any): Folder => ({
    id: row.id,
    name: row.name,
    type: row.type,
    parentId: row.parent_id || null,
  }),

  // Questions
  questionToDb: (q: Question) => ({
    id: q.id,
    title: q.title,
    content: q.content,
    subject: q.subject,
    chapter: q.chapter || '',
    class_level: q.classLevel || '',
    difficulty: q.difficulty || 'Medium',
    tags: q.tags || [],
    is_favorite: Boolean(q.isFavorite),
    is_archived: Boolean(q.isArchived),
    folder_id: q.folderId || null,
    created_at: q.createdAt || new Date().toISOString(),
  }),
  dbToQuestion: (row: any): Question => ({
    id: row.id,
    title: row.title,
    content: row.content,
    subject: row.subject as SubjectType,
    chapter: row.chapter || '',
    classLevel: row.class_level || '',
    difficulty: row.difficulty || 'Medium',
    tags: Array.isArray(row.tags) ? row.tags : [],
    isFavorite: Boolean(row.is_favorite),
    isArchived: Boolean(row.is_archived),
    folderId: row.folder_id || null,
    createdAt: row.created_at || new Date().toISOString(),
  }),

  // Documents
  documentToDb: (d: CustomDocument) => ({
    id: d.id,
    title: d.title,
    content: d.content,
    folder_id: d.folderId || null,
    language: d.language || 'bn',
    last_edited: d.lastEdited || new Date().toISOString(),
    margins: d.margins || { top: 20, bottom: 20, left: 20, right: 20 },
    font_family: d.fontFamily || 'Calibri',
    font_size: d.fontSize || 12,
    custom_footer: d.customFooter || '',
    page_numbers: Boolean(d.pageNumbers),
  }),
  dbToDocument: (row: any): CustomDocument => ({
    id: row.id,
    title: row.title,
    content: row.content,
    folderId: row.folder_id || null,
    language: row.language || 'bn',
    lastEdited: row.last_edited || new Date().toISOString(),
    margins: row.margins || { top: 20, bottom: 20, left: 20, right: 20 },
    fontFamily: row.font_family || 'Calibri',
    fontSize: Number(row.font_size || 12),
    customFooter: row.custom_footer || '',
    pageNumbers: Boolean(row.page_numbers),
  }),

  // Presentations
  presentationToDb: (p: SlidePresentation) => ({
    id: p.id,
    title: p.title,
    slides: p.slides || [],
    theme: p.theme || 'dark',
    last_edited: p.lastEdited || new Date().toISOString(),
  }),
  dbToPresentation: (row: any): SlidePresentation => ({
    id: row.id,
    title: row.title,
    slides: Array.isArray(row.slides) ? row.slides : [],
    theme: row.theme || 'dark',
    lastEdited: row.last_edited || new Date().toISOString(),
  }),

  // Activities
  activityToDb: (a: ActivityLog) => ({
    id: a.id,
    timestamp: a.timestamp,
    module: a.module,
    action: a.action,
    details: a.details || '',
    type: a.type || ActivityType.Info,
  }),
  dbToActivity: (row: any): ActivityLog => ({
    id: row.id,
    timestamp: row.timestamp,
    module: row.module,
    action: row.action,
    details: row.details || '',
    type: (row.type as ActivityType) || ActivityType.Info,
  }),

  // Settings
  settingsToDb: (s: AppSettings) => ({
    id: 'default',
    institute_name: s.instituteName,
    logo_url: s.logoUrl || '',
    theme_accent: s.themeAccent || 'emerald',
    dark_mode: Boolean(s.darkMode),
    custom_footer_text: s.customFooterText || '',
    auto_save_interval: s.autoSaveInterval || 10,
    sms_service_enabled: s.smsServiceEnabled !== false,
  }),
  dbToSettings: (row: any): AppSettings => ({
    instituteName: row?.institute_name || 'Math & Science Care',
    logoUrl: row?.logo_url || '/app_logo.jpg',
    themeAccent: row?.theme_accent || 'emerald',
    darkMode: row?.dark_mode !== false,
    customFooterText: row?.custom_footer_text || 'Cared by: Nion Hassan Nirjon',
    autoSaveInterval: Number(row?.auto_save_interval || 10),
    smsServiceEnabled: row?.sms_service_enabled !== false,
  }),

  // Exams
  examToDb: (e: Exam) => ({
    id: e.id,
    name: e.name,
    type: e.type || '',
    date: e.date,
    subject: e.subject,
    total_marks: e.totalMarks !== '' && e.totalMarks !== undefined ? Number(e.totalMarks) : null,
    class_level: e.classLevel,
    time: e.time || null,
    question_paper_name: e.questionPaperName || null,
    question_paper_url: e.questionPaperUrl || null,
  }),
  dbToExam: (row: any): Exam => ({
    id: row.id,
    name: row.name,
    type: row.type || '',
    date: row.date,
    subject: row.subject,
    totalMarks: row.total_marks !== null && row.total_marks !== undefined ? Number(row.total_marks) : '',
    classLevel: row.class_level,
    time: row.time || '',
    questionPaperName: row.question_paper_name || '',
    questionPaperUrl: row.question_paper_url || '',
  }),

  // ExamResults
  examResultToDb: (er: ExamResult) => ({
    id: er.id,
    exam_id: er.examId,
    student_id: er.studentId,
    marks_obtained: er.marksObtained !== undefined ? Number(er.marksObtained) : null,
    is_absent: Boolean(er.isAbsent),
    remarks: er.remarks || '',
  }),
  dbToExamResult: (row: any): ExamResult => ({
    id: row.id,
    examId: row.exam_id,
    studentId: row.student_id,
    marksObtained: row.marks_obtained !== null && row.marks_obtained !== undefined ? Number(row.marks_obtained) : undefined,
    isAbsent: Boolean(row.is_absent),
    remarks: row.remarks || '',
  }),

  // UploadedFiles
  uploadedFileToDb: (uf: UploadedFile) => ({
    id: uf.id,
    name: uf.name,
    url: uf.url,
    size: Number(uf.size || 0),
    type: uf.type || 'other',
    uploaded_at: uf.uploadedAt,
    linked_class: uf.linkedClass || 'All',
    linked_group: uf.linkedGroup || 'All',
    description: uf.description || '',
  }),
  dbToUploadedFile: (row: any): UploadedFile => ({
    id: row.id,
    name: row.name,
    url: row.url,
    size: Number(row.size || 0),
    type: row.type || 'other',
    uploadedAt: row.uploaded_at,
    linkedClass: row.linked_class || 'All',
    linkedGroup: row.linked_group || 'All',
    description: row.description || '',
  }),

  // FeePayments
  feePaymentToDb: (fp: FeePayment) => ({
    id: fp.id,
    student_id: fp.studentId,
    month: fp.month,
    amount: Number(fp.amount || 0),
    paid_amount: Number(fp.paidAmount || 0),
    status: fp.status || 'Unpaid',
    payment_date: fp.paymentDate || null,
  }),
  dbToFeePayment: (row: any): FeePayment => ({
    id: row.id,
    studentId: row.student_id,
    month: row.month,
    amount: Number(row.amount || 0),
    paidAmount: Number(row.paid_amount || 0),
    status: row.status || 'Unpaid',
    paymentDate: row.payment_date || '',
  }),

  // SmsLogs
  smsLogToDb: (log: SmsLog) => ({
    id: log.id,
    student_name: log.student_name,
    recipient_role: log.recipient_role,
    phone_number: log.phone_number,
    message_type: log.message_type,
    message_content: log.message_content,
    status: log.status,
    response_raw: log.response_raw,
    created_at: log.created_at || new Date().toISOString(),
  }),
  dbToSmsLog: (row: any): SmsLog => ({
    id: row.id,
    student_name: row.student_name || '',
    recipient_role: row.recipient_role || '',
    phone_number: row.phone_number || '',
    message_type: row.message_type || '',
    message_content: row.message_content || '',
    status: row.status || 'Failed',
    response_raw: row.response_raw || '',
    created_at: row.created_at || new Date().toISOString(),
  }),
};

// ==========================================
// FULL DATABASE READ & COLLECTION WRITE
// ==========================================

export async function fetchAllDataFromSupabase() {
  try {
    const [
      studentsRes,
      attendanceRes,
      foldersRes,
      questionsRes,
      documentsRes,
      presentationsRes,
      activitiesRes,
      settingsRes,
      examsRes,
      examResultsRes,
      uploadedFilesRes,
      feePaymentsRes,
      smsLogsRes,
    ] = await Promise.all([
      supabase.from('students').select('*').order('roll', { ascending: true, nullsFirst: false }),
      supabase.from('attendance').select('*'),
      supabase.from('folders').select('*'),
      supabase.from('questions').select('*'),
      supabase.from('documents').select('*'),
      supabase.from('presentations').select('*'),
      supabase.from('activities').select('*').order('timestamp', { ascending: false }),
      supabase.from('settings').select('*').limit(1),
      supabase.from('exams').select('*').order('date', { ascending: false }),
      supabase.from('exam_results').select('*'),
      supabase.from('uploaded_files').select('*').order('uploaded_at', { ascending: false }),
      supabase.from('fee_payments').select('*'),
      supabase.from('sms_logs').select('*').order('created_at', { ascending: false }),
    ]);

    const settingsRow = settingsRes.data && settingsRes.data.length > 0 ? settingsRes.data[0] : null;

    return {
      students: (studentsRes.data || []).map(mappers.dbToStudent),
      attendance: (attendanceRes.data || []).map(mappers.dbToAttendance),
      folders: (foldersRes.data || []).map(mappers.dbToFolder),
      questions: (questionsRes.data || []).map(mappers.dbToQuestion),
      documents: (documentsRes.data || []).map(mappers.dbToDocument),
      presentations: (presentationsRes.data || []).map(mappers.dbToPresentation),
      activities: (activitiesRes.data || []).map(mappers.dbToActivity),
      settings: settingsRow ? mappers.dbToSettings(settingsRow) : mappers.dbToSettings({}),
      exams: (examsRes.data || []).map(mappers.dbToExam),
      examResults: (examResultsRes.data || []).map(mappers.dbToExamResult),
      uploadedFiles: (uploadedFilesRes.data || []).map(mappers.dbToUploadedFile),
      feePayments: (feePaymentsRes.data || []).map(mappers.dbToFeePayment),
      sms_logs: (smsLogsRes.data || []).map(mappers.dbToSmsLog),
    };
  } catch (err: any) {
    console.warn("Could not fetch data from Supabase:", err.message || err);
    return null;
  }
}

export async function saveCollectionToSupabase(key: string, data: any) {
  try {
    if (key === 'settings') {
      const dbSettings = mappers.settingsToDb(Array.isArray(data) ? data[0] : data);
      const { error } = await supabase.from('settings').upsert(dbSettings, { onConflict: 'id' });
      if (error) console.warn('Supabase settings update notice:', error.message || error);
      return;
    }

    const tableNameMap: Record<string, { table: string; mapper: (item: any) => any }> = {
      students: { table: 'students', mapper: mappers.studentToDb },
      attendance: { table: 'attendance', mapper: mappers.attendanceToDb },
      folders: { table: 'folders', mapper: mappers.folderToDb },
      questions: { table: 'questions', mapper: mappers.questionToDb },
      documents: { table: 'documents', mapper: mappers.documentToDb },
      presentations: { table: 'presentations', mapper: mappers.presentationToDb },
      activities: { table: 'activities', mapper: mappers.activityToDb },
      exams: { table: 'exams', mapper: mappers.examToDb },
      examResults: { table: 'exam_results', mapper: mappers.examResultToDb },
      exam_results: { table: 'exam_results', mapper: mappers.examResultToDb },
      uploadedFiles: { table: 'uploaded_files', mapper: mappers.uploadedFileToDb },
      feePayments: { table: 'fee_payments', mapper: mappers.feePaymentToDb },
      sms_logs: { table: 'sms_logs', mapper: mappers.smsLogToDb },
      smsLogs: { table: 'sms_logs', mapper: mappers.smsLogToDb },
    };

    const config = tableNameMap[key];
    if (!config) return;

    const items = Array.isArray(data) ? data : [data];

    if (items.length === 0) {
      const { data: existing } = await supabase.from(config.table).select('id');
      if (existing && existing.length > 0) {
        const allIds = existing.map(row => row.id);
        await supabase.from(config.table).delete().in('id', allIds);
      }
      return;
    }

    const mappedItems = items.map(config.mapper);

    // 1. Upsert incoming records
    const { error: upsertErr } = await supabase.from(config.table).upsert(mappedItems, { onConflict: 'id' });
    if (upsertErr) {
      console.warn(`Supabase upsert notice for ${config.table}:`, upsertErr.message || upsertErr);
      return;
    }

    // 2. Safely remove deleted records
    const { data: existing } = await supabase.from(config.table).select('id');
    if (existing) {
      const incomingIdSet = new Set(mappedItems.map(i => i.id));
      const idsToDelete = existing.map(row => row.id).filter(id => !incomingIdSet.has(id));
      if (idsToDelete.length > 0) {
        const { error: deleteErr } = await supabase.from(config.table).delete().in('id', idsToDelete);
        if (deleteErr) {
          console.warn(`Supabase delete notice for ${config.table}:`, deleteErr.message || deleteErr);
        }
      }
    }
  } catch (err: any) {
    console.warn(`Supabase saveCollectionToSupabase notice for ${key}:`, err.message || err);
  }
}
