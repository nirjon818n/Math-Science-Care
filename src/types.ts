/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum StudentStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

export enum AttendanceStatus {
  Present = 'Present',
  Absent = 'Absent',
  Late = 'Late',
  Leave = 'Leave',
}

export enum SubjectType {
  Math = 'Math',
  Physics = 'Physics',
  Chemistry = 'Chemistry',
  Biology = 'Biology',
  General = 'General',
}

export enum ActivityType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Danger = 'danger',
}

export interface Student {
  id: string;
  roll?: number;
  name: string;
  nameBangla?: string;
  classLevel: string; // e.g. "Class 10", "HSC 1st Year"
  groupName: string; // e.g. "Science", "General"
  batch: string; // e.g. "Batch A", "Batch B"
  batchTime: string; // e.g. "04:00 PM"
  school: string;
  schoolRoll?: string;
  parentName: string;
  parentPhone: string;
  fathersName?: string;
  fathersPhone?: string;
  mothersName?: string;
  mothersPhone?: string;
  monthlyFee: number;
  admissionDate: string;
  status: StudentStatus;
  notes: string;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  status: AttendanceStatus;
  timestamp: string; // ISO date-time
}

export interface Folder {
  id: string;
  name: string;
  type: 'question' | 'document';
  parentId: string | null;
}

export interface Question {
  id: string;
  title: string;
  content: string; // Markdown / Text with LaTeX
  subject: SubjectType;
  chapter: string;
  classLevel: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;
  folderId: string | null;
  createdAt: string;
}

export interface DocElement {
  id: string;
  type: 'paragraph' | 'heading1' | 'heading2' | 'math' | 'table' | 'image' | 'list';
  content: string;
  properties?: any;
}

export interface CustomDocument {
  id: string;
  title: string;
  content: string; // JSON string or HTML string of blocks
  folderId: string | null;
  language: 'en' | 'bn';
  lastEdited: string;
  margins: { top: number; bottom: number; left: number; right: number };
  fontFamily: string;
  fontSize: number;
  customFooter: string;
  pageNumbers: boolean;
}

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'table';
  content: string;
  x: number; // percentage or px
  y: number;
  width: number;
  height: number;
  style?: {
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    borderRadius?: string;
    borderColor?: string;
    borderWidth?: string;
  };
}

export interface Slide {
  id: string;
  title: string;
  elements: SlideElement[];
  notes: string;
  background: string; // hex or tailwind class
  transition?: string;
}

export interface SlidePresentation {
  id: string;
  title: string;
  slides: Slide[];
  theme: 'dark' | 'light' | 'emerald' | 'sunset' | 'cobalt' | 'nord';
  lastEdited: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  module: string; // e.g. "Students", "Attendance", "Documents", "Slides"
  action: string; // e.g. "Student Added", "Attendance Saved"
  details: string;
  type: ActivityType;
}

export interface AppSettings {
  instituteName: string;
  logoUrl: string;
  themeAccent: string; // e.g., 'emerald', 'indigo', 'violet', 'amber'
  darkMode: boolean;
  customFooterText: string;
  autoSaveInterval: number; // in seconds
  smsServiceEnabled?: boolean;
}

export interface Exam {
  id: string;
  name: string;
  type: 'Weekly' | 'Monthly' | '';
  date: string; // YYYY-MM-DD
  subject: string;
  totalMarks: number | '';
  classLevel: string; // e.g. "Class 8", "Class 10", "HSC 1st Year"
  time?: string; // HH:MM or similar time representation
  questionPaperName?: string;
  questionPaperUrl?: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  marksObtained?: number; // undefined or empty string if absent or not graded yet
  isAbsent: boolean;
  remarks?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string; // "pdf" | "docx" | "image" | "other"
  uploadedAt: string;
  linkedClass: string; // e.g. "Class 8", "Class 10", "HSC 1st Year", "All"
  linkedGroup: string; // e.g. "Science", "Commerce", "General", "All"
  description: string;
}

export interface FeePayment {
  id: string;
  studentId: string;
  month: string; // e.g., "2026-07"
  amount: number; // monthly fee set at the time of record
  paidAmount: number; // actual amount received, customisable
  status: 'Paid' | 'Unpaid';
  paymentDate?: string; // YYYY-MM-DD
}

export interface SmsLog {
  id: string;
  student_name: string;
  recipient_role: string;
  phone_number: string;
  message_type: string;
  message_content: string;
  status: 'Success' | 'Failed';
  response_raw: string;
  created_at: string;
}



