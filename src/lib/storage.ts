/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  SmsLog
} from '../types';

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

// Initial Seed Data
const INITIAL_STUDENTS: Student[] = [];

const INITIAL_FOLDERS: Folder[] = [
  { id: 'f-1', name: 'Mathematics Core', type: 'question', parentId: null },
  { id: 'f-2', name: 'Science Mechanics & Light', type: 'question', parentId: null },
  { id: 'f-3', name: 'General Science Questions', type: 'question', parentId: null },
  { id: 'f-4', name: 'Exam Sheets 2026', type: 'document', parentId: null },
  { id: 'f-5', name: 'Lecture Modules', type: 'document', parentId: null },
];

const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q-1',
    title: 'Algebraic Identity Proof',
    content: 'Prove the standard algebraic identity $(a+b)^2 = a^2 + 2ab + b^2$ using geometric area decomposition. Draw or describe a square of side length $(a+b)$ subdivided into smaller squares and rectangles.',
    subject: SubjectType.Math,
    chapter: 'Algebraic Expressions',
    classLevel: 'Class 8',
    difficulty: 'Medium',
    tags: ['Algebra', 'Identities', 'Proof'],
    isFavorite: true,
    isArchived: false,
    folderId: 'f-1',
    createdAt: '2026-06-15T10:00:00Z',
  },
  {
    id: 'q-2',
    title: 'Unitary Method calculation',
    content: 'If 15 workers can build a wall in 45 hours, how many workers are needed to complete the same wall in 25 hours, assuming all workers work at the same rate?',
    subject: SubjectType.Math,
    chapter: 'Arithmetic',
    classLevel: 'Class 6',
    difficulty: 'Easy',
    tags: ['Arithmetic', 'Unitary Method', 'Ratios'],
    isFavorite: false,
    isArchived: false,
    folderId: 'f-1',
    createdAt: '2026-06-20T11:30:00Z',
  },
  {
    id: 'q-3',
    title: 'Properties of Light Reflection',
    content: 'Explain the laws of reflection of light. Show that the angle of incidence ($i$) is equal to the angle of reflection ($r$):\n\n$$\\angle i = \\angle r$$\n\nGive two examples of regular reflection from everyday observations.',
    subject: SubjectType.Physics,
    chapter: 'Light',
    classLevel: 'Class 7',
    difficulty: 'Medium',
    tags: ['Light', 'Reflection', 'Optics'],
    isFavorite: true,
    isArchived: false,
    folderId: 'f-2',
    createdAt: '2026-06-25T14:15:00Z',
  },
  {
    id: 'q-4',
    title: 'Structure of the Atom',
    content: 'Describe Rutherford\'s atomic model and explain why it is compared to the solar system. What are the main limitations of this model? Detail the subatomic particles (protons, neutrons, electrons) and their charges.',
    subject: SubjectType.Chemistry,
    chapter: 'Structure of Matter',
    classLevel: 'Class 8',
    difficulty: 'Hard',
    tags: ['Atom', 'Rutherford', 'Chemistry'],
    isFavorite: true,
    isArchived: false,
    folderId: 'f-3',
    createdAt: '2026-07-01T09:45:00Z',
  },
  {
    id: 'q-5',
    title: 'Photosynthesis Process in Plants',
    content: 'Explain the process of photosynthesis by which green plants prepare their food. Write down the complete balanced chemical equation representing the conversion of carbon dioxide and water into glucose and oxygen in the presence of sunlight and chlorophyll.',
    subject: SubjectType.Biology,
    chapter: 'Plant Physiology',
    classLevel: 'Class 5',
    difficulty: 'Medium',
    tags: ['Photosynthesis', 'Plants', 'Biology'],
    isFavorite: false,
    isArchived: false,
    folderId: 'f-3',
    createdAt: '2026-07-05T16:20:00Z',
  }
];

const INITIAL_DOCUMENTS: CustomDocument[] = [
  {
    id: 'd-1',
    title: 'Class 8 Weekly Quiz: Algebraic Expressions',
    content: '<h1>Class 8 Weekly Assessment - Math & Science Care</h1><p><strong>Subject:</strong> Mathematics (Algebra)<br><strong>Class Level:</strong> Class 8<br><strong>Time Allowed:</strong> 45 Minutes<br><strong>Total Marks:</strong> 25</p><hr><p>Solve the following structural mathematical problems. Ensure that you show each analytical step clearly in your answer booklet.</p><h3>Question 1 (10 Marks)</h3><p>Evaluate the expression and find its value when $a=3, b=2$:</p><div class="math-block">$$E = (2a + 3b)^2 - (2a - 3b)^2$$</div><h3>Question 2 (15 Marks)</h3><p>Verify whether the algebraic identity holds true for $x=5$:</p><div class="math-block">$$(x + 3)(x + 5) = x^2 + 8x + 15$$</div>',
    folderId: 'f-4',
    language: 'en',
    lastEdited: '2026-07-08T18:00:00Z',
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    fontFamily: 'Calibri',
    fontSize: 12,
    customFooter: 'Cared by: Nion Hassan Nirjon',
    pageNumbers: true,
  },
  {
    id: 'd-2',
    title: 'পদার্থবিজ্ঞানঃ গতিবিদ্যা ও বলের সূত্র (Physics Class 8 Lecture Sheet)',
    content: '<h1>পদার্থবিজ্ঞানঃ গতি ও বলের সূত্রাবলি (Class 8 Lecture Sheet)</h1><p><strong>অধ্যায়ঃ</strong> গতিবিদ্যা এবং নিউটনের বলবিদ্যা<br><strong>তত্ত্বাবধানেঃ</strong> নিয়ন হাসান নির্জন (Nion Hassan Nirjon)</p><hr><p>গতি ও বল সম্পর্কিত গুরুত্বপূর্ণ সুত্রসমূহ এবং বাস্তবভিত্তিক গাণিতিক সমস্যা নিচে দেওয়া হলো। এই সুত্রগুলো পদার্থবিজ্ঞানের গতিবিদ্যার মূল ভিত্তি।</p><h3>১. সমবেগের ক্ষেত্রে দূরত্বঃ</h3><div class="math-block">$$s = vt$$</div><h3>২. সমত্বরণে চলমান বস্তুর গাণিতিক সমীকরণসমূহঃ</h3><p>ক) শেষ বেগ: $v = u + at$</p><p>খ) অতিক্রান্ত দূরত্ব: $s = ut + \\frac{1}{2}at^2$</p><p>গ) শেষ বেগের বর্গ: $v^2 = u^2 + 2as$</p><hr><p><strong>গাণিতিক উদাহরণ:</strong> একটি স্থির গাড়ি $2\\text{ m/s}^2$ সুষম ত্বরণে $10\\text{ s}$ চলল। অতিক্রান্ত দূরত্ব নির্ণয় করো।</p><p><strong>সমাধান:</strong> এখানে আদিবেগ $u = 0$, ত্বরণ $a = 2\\text{ m/s}^2$, সময় $t = 10\\text{ s}$।</p><p>সুত্র বসিয়ে পাই: $s = ut + \\frac{1}{2}at^2 \\Rightarrow s = 0 \\times 10 + \\frac{1}{2} \\times 2 \\times 10^2 = 100\\text{ meters}$।</p>',
    folderId: 'f-5',
    language: 'bn',
    lastEdited: '2026-07-09T20:30:00Z',
    margins: { top: 25, bottom: 25, left: 25, right: 25 },
    fontFamily: 'Kalpurush',
    fontSize: 14,
    customFooter: 'Cared by: Nion Hassan Nirjon',
    pageNumbers: true,
  }
];

const INITIAL_PRESENTATIONS: SlidePresentation[] = [
  {
    id: 'p-1',
    title: 'Introduction to Quantum Theory',
    theme: 'dark',
    lastEdited: '2026-07-09T22:00:00Z',
    slides: [
      {
        id: 'p1-s1',
        title: 'Quantum Physics Demystified',
        background: 'bg-slate-900',
        notes: 'Introduce yourself and set the stage for modern quantum mechanics. Emphasize that classical mechanics failed at atomic levels.',
        elements: [
          {
            id: 'p1-s1-e1',
            type: 'text',
            content: '# Quantum Physics\n## Masterclass Lecture Series\n\nInstructor: **Nion Hassan Nirjon**\n*Math & Science Care*',
            x: 10,
            y: 25,
            width: 80,
            height: 50,
            style: { color: '#f8fafc', fontSize: 24, fontFamily: 'Calibri', textAlign: 'center' }
          }
        ]
      },
      {
        id: 'p1-s2',
        title: 'Planck\'s Quantum Hypothesis',
        background: 'bg-slate-900',
        notes: 'Explain Max Planck\'s 1900 discovery regarding blackbody radiation. Energy is not continuous, but packet-based.',
        elements: [
          {
            id: 'p1-s2-e1',
            type: 'text',
            content: 'In 1900, Max Planck proposed that electromagnetic energy could only be emitted or absorbed in discrete packets, which he called **quanta**.\n\nThe energy $E$ of a single quantum is proportional to its frequency $f$:',
            x: 8,
            y: 18,
            width: 84,
            height: 30,
            style: { color: '#e2e8f0', fontSize: 18, fontFamily: 'Calibri', textAlign: 'left' }
          },
          {
            id: 'p1-s2-e2',
            type: 'text',
            content: '$$E = h f$$',
            x: 15,
            y: 52,
            width: 70,
            height: 20,
            style: { color: '#38bdf8', fontSize: 32, fontFamily: 'Courier New', textAlign: 'center' }
          },
          {
            id: 'p1-s2-e3',
            type: 'text',
            content: 'Where **$h$** is Planck\'s constant: \n$$h \\approx 6.626 \\times 10^{-34} \\text{ J}\\cdot\\text{s}$$',
            x: 8,
            y: 75,
            width: 84,
            height: 15,
            style: { color: '#94a3b8', fontSize: 14, fontFamily: 'Calibri', textAlign: 'center' }
          }
        ]
      }
    ]
  }
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

const INITIAL_ACTIVITIES: ActivityLog[] = [
  { id: 'act-1', timestamp: '2026-07-10T10:00:00Z', module: 'System', action: 'Database Initialized', details: 'Tuition portal fully initialized with realistic demonstration records.', type: ActivityType.Success },
  { id: 'act-2', timestamp: '2026-07-10T11:15:00Z', module: 'Question Bank', action: 'Question Created', details: 'Created redox balancing question in organic chemistry.', type: ActivityType.Info },
  { id: 'act-3', timestamp: '2026-07-10T14:30:00Z', module: 'Attendance', action: 'Attendance Recorded', details: 'Daily attendance initialized for Class 9 Delta Batch.', type: ActivityType.Warning },
  { id: 'act-4', timestamp: '2026-07-10T16:02:00Z', module: 'Attendance', action: 'Student Logged', details: 'Abrar Shahriar marked PRESENT for Alpha Batch.', type: ActivityType.Success },
  { id: 'act-5', timestamp: '2026-07-10T17:05:00Z', module: 'Documents', action: 'Document Compiled', details: 'Compiled "HSC Weekly Quiz: Calculus Limits" as a clean PDF.', type: ActivityType.Info },
];

const INITIAL_SETTINGS: AppSettings = {
  instituteName: 'Math & Science Care',
  logoUrl: '',
  themeAccent: 'emerald',
  darkMode: true,
  customFooterText: 'Cared by: Nion Hassan Nirjon',
  autoSaveInterval: 10,
  smsServiceEnabled: true,
};

// Storage Helpers
function loadData<T>(key: string, defaultData: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  try {
    return JSON.parse(stored) as T;
  } catch (e) {
    console.error('Error loading data for key ' + key, e);
    return defaultData;
  }
}

function saveData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Global CRUD Helpers API
export const StorageManager = {
  getStudents: (): Student[] => loadData<Student[]>(KEYS.STUDENTS, INITIAL_STUDENTS),
  saveStudents: (data: Student[]) => saveData<Student[]>(KEYS.STUDENTS, data),

  getAttendance: (): AttendanceRecord[] => loadData<AttendanceRecord[]>(KEYS.ATTENDANCE, INITIAL_ATTENDANCE),
  saveAttendance: (data: AttendanceRecord[]) => saveData<AttendanceRecord[]>(KEYS.ATTENDANCE, data),

  getFolders: (): Folder[] => loadData<Folder[]>(KEYS.FOLDERS, INITIAL_FOLDERS),
  saveFolders: (data: Folder[]) => saveData<Folder[]>(KEYS.FOLDERS, data),

  getQuestions: (): Question[] => loadData<Question[]>(KEYS.QUESTIONS, INITIAL_QUESTIONS),
  saveQuestions: (data: Question[]) => saveData<Question[]>(KEYS.QUESTIONS, data),

  getDocuments: (): CustomDocument[] => loadData<CustomDocument[]>(KEYS.DOCUMENTS, INITIAL_DOCUMENTS),
  saveDocuments: (data: CustomDocument[]) => saveData<CustomDocument[]>(KEYS.DOCUMENTS, data),

  getPresentations: (): SlidePresentation[] => loadData<SlidePresentation[]>(KEYS.PRESENTATIONS, INITIAL_PRESENTATIONS),
  savePresentations: (data: SlidePresentation[]) => saveData<SlidePresentation[]>(KEYS.PRESENTATIONS, data),

  getActivities: (): ActivityLog[] => loadData<ActivityLog[]>(KEYS.ACTIVITIES, INITIAL_ACTIVITIES),
  saveActivities: (data: ActivityLog[]) => saveData<ActivityLog[]>(KEYS.ACTIVITIES, data),
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

  getSettings: (): AppSettings => {
    return loadData<AppSettings>(KEYS.SETTINGS, INITIAL_SETTINGS);
  },
  saveSettings: (data: AppSettings) => saveData<AppSettings>(KEYS.SETTINGS, data),

  getExams: (): Exam[] => loadData<Exam[]>(KEYS.EXAMS, []),
  saveExams: (data: Exam[]) => saveData<Exam[]>(KEYS.EXAMS, data),

  getExamResults: (): ExamResult[] => loadData<ExamResult[]>(KEYS.EXAM_RESULTS, []),
  saveExamResults: (data: ExamResult[]) => saveData<ExamResult[]>(KEYS.EXAM_RESULTS, data),

  getUploadedFiles: (): UploadedFile[] => loadData<UploadedFile[]>(KEYS.UPLOADED_FILES, []),
  saveUploadedFiles: (data: UploadedFile[]) => saveData<UploadedFile[]>(KEYS.UPLOADED_FILES, data),

  getFeePayments: (): FeePayment[] => loadData<FeePayment[]>(KEYS.FEE_PAYMENTS, []),
  saveFeePayments: (data: FeePayment[]) => saveData<FeePayment[]>(KEYS.FEE_PAYMENTS, data),

  getSmsLogs: (): SmsLog[] => loadData<SmsLog[]>(KEYS.SMS_LOGS, []),
  saveSmsLogs: (data: SmsLog[]) => saveData<SmsLog[]>(KEYS.SMS_LOGS, data),

  resetDatabase: () => {
    localStorage.removeItem(KEYS.STUDENTS);
    localStorage.removeItem(KEYS.ATTENDANCE);
    localStorage.removeItem(KEYS.FOLDERS);
    localStorage.removeItem(KEYS.QUESTIONS);
    localStorage.removeItem(KEYS.DOCUMENTS);
    localStorage.removeItem(KEYS.PRESENTATIONS);
    localStorage.removeItem(KEYS.ACTIVITIES);
    localStorage.removeItem(KEYS.SETTINGS);
    localStorage.removeItem(KEYS.EXAMS);
    localStorage.removeItem(KEYS.EXAM_RESULTS);
    localStorage.removeItem(KEYS.UPLOADED_FILES);
    localStorage.removeItem(KEYS.FEE_PAYMENTS);
    localStorage.removeItem(KEYS.SMS_LOGS);
    // Reload window or return fresh seed
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
