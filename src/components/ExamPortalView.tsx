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
  AlertCircle,
  Download,
  Printer,
  FileText,
  Send
} from 'lucide-react';

// Helper functions for exact date & time formatting
export function formatExamDate(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatExamTime(timeStr?: string) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = String(minutes).padStart(2, '0');
    return `${hours}:${minutesStr} ${ampm}`;
  }
  return timeStr;
}

export default function ExamPortalView() {
  const { students, exams, examResults, addExam, updateExam, deleteExam, saveExamResults, showToast, addSmsLog, adminPassword, settings } = useApp();

  // Navigation states
  const [activeView, setActiveView] = useState<'list' | 'entry' | 'stats'>('list');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Search & Filter states for Exam list
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Weekly' | 'Monthly'>('All');
  const [classFilter, setClassFilter] = useState<string>('All');

  // Exam Modal Form state
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examForm, setExamForm] = useState<{
    name: string;
    type: 'Weekly' | 'Monthly' | '';
    date: string;
    time: string;
    subject: string;
    totalMarks: number | '';
    classLevel: string;
  }>({
    name: '',
    type: '',
    date: '',
    time: '',
    subject: '',
    totalMarks: '',
    classLevel: '',
  });
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [publishingExamId, setPublishingExamId] = useState<string | null>(null);

  // Marks Entry local state
  const [localMarks, setLocalMarks] = useState<Record<string, { marksObtained: string; isAbsent: boolean; remarks: string }>>({});
  const [marksSearch, setMarksSearch] = useState('');

  // Extract unique classes from active students for selection
  const activeStudents = useMemo(() => students.filter(s => s.status === StudentStatus.Active), [students]);
  const classLevelsList = useMemo(() => {
    const list = Array.from(new Set(students.map(s => s.classLevel))).filter(Boolean) as string[];
    const getRank = (c: string) => {
      const normalized = c.trim().toLowerCase();
      if (normalized.includes('class 4') || normalized.includes('৪র্থ') || normalized === 'class iv') return 4;
      if (normalized.includes('class 5') || normalized.includes('৫ম') || normalized === 'class v') return 5;
      if (normalized.includes('class 6') || normalized.includes('সিক্স') || normalized.includes('৬ষ্ঠ') || normalized === 'class vi') return 6;
      if (normalized.includes('class 7') || normalized.includes('সেভেন') || normalized.includes('৭ম') || normalized === 'class vii') return 7;
      if (normalized.includes('class 8') || normalized.includes('এইট') || normalized.includes('৮ম') || normalized === 'class viii') return 8;
      if (normalized.includes('class 9') || normalized.includes('নাইন') || normalized.includes('৯ম') || normalized === 'class ix') return 9;
      if (normalized.includes('class 10') || normalized.includes('টেন') || normalized.includes('১০ম') || normalized === 'class x') return 10;
      if (normalized.includes('ssc')) return 11;
      if (normalized.includes('hsc 1st') || normalized.includes('hsc 1') || normalized.includes('11th') || normalized.includes('একাদশ')) return 12;
      if (normalized.includes('hsc 2nd') || normalized.includes('hsc 2') || normalized.includes('12th') || normalized.includes('দ্বাদশ')) return 13;
      if (normalized.includes('hsc')) return 14;

      const numMatch = normalized.match(/(\d+)/);
      if (numMatch) {
        return parseInt(numMatch[1], 10);
      }
      return 999;
    };
    const sortedList = [...list].sort((a, b) => getRank(a) - getRank(b));
    return sortedList.length > 0 ? sortedList : ['Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8'];
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
    }).sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return dateTimeB - dateTimeA;
    });
  }, [exams, searchQuery, typeFilter, classFilter]);

  // Open Exam Modal for Create
  const handleOpenCreateModal = () => {
    setEditingExam(null);
    setExamForm({
      name: '',
      type: '',
      date: '',
      time: '',
      subject: '',
      totalMarks: '',
      classLevel: '',
    });
    setQuestionFile(null);
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
      time: exam.time || '',
      subject: exam.subject,
      totalMarks: exam.totalMarks,
      classLevel: exam.classLevel,
    });
    setQuestionFile(null);
    setIsExamModalOpen(true);
  };

  // Handle Exam Form Submit
  const handleExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !examForm.name.trim() ||
      !examForm.type ||
      !examForm.classLevel ||
      !examForm.subject.trim() ||
      examForm.totalMarks === '' ||
      !examForm.date ||
      !examForm.time
    ) {
      showToast('সবগুলো ফিল্ড সঠিকভাবে পূরণ করুন!', 'error');
      return;
    }

    if (Number(examForm.totalMarks) <= 0) {
      showToast('টোটাল মার্কস অবশ্যই ০ এর বেশি হতে হবে!', 'error');
      return;
    }

    if (!editingExam && !questionFile) {
      showToast('অনুগ্রহ করে প্রশ্নপত্রের PDF ফাইলটি আপলোড করুন!', 'error');
      return;
    }

    // Prepare submission values
    const examPayload = {
      name: examForm.name.trim(),
      type: examForm.type as 'Weekly' | 'Monthly',
      date: examForm.date,
      time: examForm.time,
      subject: examForm.subject.trim(),
      totalMarks: Number(examForm.totalMarks),
      classLevel: examForm.classLevel,
      questionPaperName: questionFile ? questionFile.name : editingExam?.questionPaperName,
      questionPaperUrl: questionFile ? 'blob:' + URL.createObjectURL(questionFile) : editingExam?.questionPaperUrl,
    };

    if (editingExam) {
      updateExam({
        ...editingExam,
        ...examPayload,
      });
    } else {
      addExam(examPayload);
    }
    setIsExamModalOpen(false);
  };

  // Delete Exam handler
  const handleDeleteExam = (exam: Exam, e: React.MouseEvent) => {
    e.stopPropagation();
    setExamToDelete(exam);
  };

  const executeDeleteExam = () => {
    if (!examToDelete) return;
    deleteExam(examToDelete.id);
    if (selectedExamId === examToDelete.id) {
      setSelectedExamId(null);
      setActiveView('list');
    }
    setExamToDelete(null);
  };

  // Publish & Send SMS parallel dispatch handler
  const handlePublishResults = async (exam: Exam, e: React.MouseEvent) => {
    e.stopPropagation();
    if (publishingExamId) return;

    const classStudents = activeStudents.filter(s => s.classLevel === exam.classLevel);
    if (classStudents.length === 0) {
      showToast('এই ক্লাসে কোনো সক্রিয় শিক্ষার্থী নেই!', 'error');
      return;
    }

    setPublishingExamId(exam.id);
    showToast('এসএমএস পাঠানো শুরু হয়েছে...', 'success');

    let successCount = 0;
    let failCount = 0;

    const cleanPhoneNumber = (phone: string): string => {
      if (!phone) return '';
      let cleaned = phone.replace(/[^0-9]/g, '');
      if (cleaned.startsWith('88')) {
        cleaned = cleaned.substring(2);
      }
      return cleaned;
    };

    // Prepare all SMS sending promises
    const sendPromises = classStudents.map(async (student) => {
      const result = examResults.find(r => r.examId === exam.id && r.studentId === student.id);
      if (!result) return; // Skip if no result record at all

      let obtainedMarksText = '';
      if (result.isAbsent) {
        obtainedMarksText = 'অনুপস্থিত';
      } else if (result.marksObtained !== undefined) {
        obtainedMarksText = String(result.marksObtained);
      } else {
        return; // Skip if pending or not graded
      }

      const examTypeText = exam.type === 'Weekly' ? 'সাপ্তাহিক' : 'মাসিক';
      const messageContent = `আসসালামু আলাইকুম。\nপ্রিয় অভিভাবক,\n\"শিক্ষার্থী ${student.name}\"-এর ${examTypeText} ${exam.name} পরীক্ষার ফলাফল প্রকাশ করা হয়েছে。\nপ্রাপ্ত নম্বর: ${obtainedMarksText}/${exam.totalMarks}\nশিক্ষার্থীর আরও উন্নতির জন্য নিয়মিত অনুশীলন ও উপস্থিতি নিশ্চিত করার অনুরোধ রইল。\nধন্যবাদান্তে,\nMath & Science Care`;

      const fatherPhone = student.fathersPhone || student.parentPhone || '';
      const motherPhone = student.mothersPhone || '';

      const fatherCleaned = cleanPhoneNumber(fatherPhone);
      const motherCleaned = cleanPhoneNumber(motherPhone);

      const rawPhones = [fatherPhone, motherPhone];
      const validPhones = Array.from(
        new Set(
          rawPhones
            .map(cleanPhoneNumber)
            .filter((p) => p.length === 11 && p.startsWith('01'))
        )
      );

      if (validPhones.length === 0) {
        return;
      }

      if (settings.smsServiceEnabled === false) {
        showToast('⚠️ SMS সার্ভিস বর্তমানে বন্ধ রয়েছে। SMS পাঠাতে প্রথমে সার্ভিস চালু করুন।', 'warning');
        return;
      }

      // Parallel requests for both parents
      const studentSmsPromises = validPhones.map(async (phone) => {
        const recipientRole = phone === fatherCleaned ? 'Father' : 'Mother';
        let smsStatus: 'Success' | 'Failed' = 'Failed';
        let responseRaw = '';

        try {
          const payload = new URLSearchParams({
            apikey: "510b17b71592af35dac9cba3d019dc30",
            sender: "8809617639923",
            msisdn: phone,
            smstext: messageContent,
            smsformat: "8"
          });

          const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Admin-Password': adminPassword || '2010636075'
            },
            body: payload.toString()
          });

          responseRaw = `HTTP ${response.status}`;
          if (response.ok) {
            const data = await response.json();
            responseRaw = JSON.stringify(data);
            if (data.success) {
              smsStatus = 'Success';
              successCount++;
            } else {
              failCount++;
              console.error(`✗ Automas API returned failure for ${phone}:`, data.error || 'Unknown error');
            }
          } else {
            failCount++;
            const errText = await response.text();
            responseRaw = errText;
            console.error(`✗ Failed to send Exam Result SMS to ${phone} with status ${response.status}:`, errText);
          }
        } catch (err: unknown) {
          failCount++;
          const errMsg = err instanceof Error ? err.message : 'Unknown network/fetch error';
          responseRaw = responseRaw || errMsg;
          console.error(`✗ Error dispatching Exam Result SMS to ${phone}:`, errMsg);
        } finally {
          addSmsLog({
            student_name: student.name,
            recipient_role: recipientRole,
            phone_number: phone,
            message_type: 'Exam Result',
            message_content: messageContent,
            status: smsStatus,
            response_raw: responseRaw,
          });
        }
      });

      await Promise.all(studentSmsPromises);
    });

    try {
      await Promise.all(sendPromises);
      showToast(`প্রকাশনা সম্পন্ন! ${successCount}টি সফল, ${failCount}টি ব্যর্থ।`, 'success');
    } catch (err) {
      console.error("Error in batch dispatching SMS:", err);
      showToast('ব্যাচ এসএমএস ডিসপ্যাচ করার সময় কিছু সমস্যা হয়েছে!', 'error');
    } finally {
      setPublishingExamId(null);
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

  // Get all active class students with their scores/absent/pending status
  const fullClassResults = useMemo(() => {
    if (!selectedExam) return [];
    const resultsForExam = examResults.filter(r => r.examId === selectedExam.id);
    const classStudents = activeStudents
      .filter(s => s.classLevel === selectedExam.classLevel)
      .sort((a, b) => (a.roll || 9999) - (b.roll || 9999));

    return classStudents.map(student => {
      const result = resultsForExam.find(r => r.studentId === student.id);
      const isAbsent = result?.isAbsent || false;
      const marks = isAbsent ? 'Absent' : (result?.marksObtained !== undefined ? result.marksObtained : 'Pending');
      const pct = (result && !isAbsent && result.marksObtained !== undefined) 
        ? Math.round((result.marksObtained / selectedExam.totalMarks) * 100) 
        : null;
      
      // Grade calculation
      let grade = 'Pending';
      if (pct !== null) {
        if (pct >= 80) grade = 'A+';
        else if (pct >= 70) grade = 'A';
        else if (pct >= 60) grade = 'A-';
        else if (pct >= 50) grade = 'B';
        else if (pct >= 40) grade = 'C';
        else grade = 'F';
      } else if (isAbsent) {
        grade = 'Absent';
      }

      return {
        roll: student.roll ?? 'N/A',
        name: student.name,
        school: student.school || 'N/A',
        marks: typeof marks === 'number' ? String(marks) : marks,
        percentage: pct !== null ? `${pct}%` : 'N/A',
        grade: grade,
        remarks: result?.remarks || 'N/A',
      };
    });
  }, [selectedExam, examResults, activeStudents]);

  // CSV Report Downloader
  const handleDownloadCSV = () => {
    if (!selectedExam || fullClassResults.length === 0) return;

    const headers = ['Roll', 'Student Name', 'School', 'Marks Obtained', 'Percentage', 'Grade', 'Remarks'];
    const rows = fullClassResults.map(r => [
      r.roll,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.school.replace(/"/g, '""')}"`,
      r.marks,
      r.percentage,
      r.grade,
      `"${r.remarks.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      `Exam Name: ${selectedExam.name}`,
      `Subject: ${selectedExam.subject}, Class: ${selectedExam.classLevel}, Total Marks: ${selectedExam.totalMarks}, Date: ${selectedExam.date}`,
      '',
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\r\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedExam.name.replace(/\s+/g, '_')}_Result_Sheet.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Result sheet downloaded as CSV successfully!', 'success');
  };

  // Styled PDF/Printer Report Generator
  const handlePrintResultSheet = () => {
    if (!selectedExam || fullClassResults.length === 0 || !examAnalytics) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Pop-up blocked! Please allow pop-ups to print the report.', 'error');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Result Sheet - ${selectedExam.name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            margin: 40px;
            line-height: 1.5;
            background-color: #ffffff;
          }
          .header {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
          }
          .brand-title {
            font-family: Georgia, 'Times New Roman', Times, serif;
            font-size: 32px;
            font-weight: bold;
            color: #000000;
            margin: 0;
            line-height: 1.2;
          }
          .brand-tagline {
            font-family: Georgia, 'Times New Roman', Times, serif;
            font-style: italic;
            font-size: 15px;
            color: #1e293b;
            margin: 4px 0 0 0;
          }
          .brand-location {
            font-family: Georgia, 'Times New Roman', Times, serif;
            text-decoration: underline;
            font-size: 14px;
            color: #1e293b;
            margin: 4px 0 0 0;
          }
          .title-divider {
            margin-top: 15px;
            border-bottom: 2px solid #cbd5e1;
          }
          .title {
            font-size: 18px;
            font-weight: bold;
            color: #0f172a;
            margin: 15px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-grid {
            display: grid;
            grid-template-cols: repeat(4, 1fr);
            gap: 15px;
            margin-top: 20px;
            text-align: left;
            background: #f8fafc;
            padding: 16px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          .meta-item {
            font-size: 13px;
            color: #475569;
          }
          .meta-item strong {
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 25px;
          }
          th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 12px 10px;
            font-weight: 600;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
            color: #334155;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .text-center {
            text-align: center;
          }
          .font-bold {
            font-weight: bold;
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
          }
          .badge-aplus { background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
          .badge-a { background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
          .badge-aminus { background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
          .badge-b { background-color: #fef9c3; color: #713f12; border: 1px solid #fef08a; }
          .badge-c { background-color: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
          .badge-f { background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
          .badge-absent { background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
          .badge-pending { background-color: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
          
          .footer {
            margin-top: 60px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 80px;
            padding: 0 40px;
          }
          .signature-box {
            border-top: 1.5px dashed #94a3b8;
            width: 200px;
            text-align: center;
            font-size: 12px;
            padding-top: 8px;
            color: #475569;
            font-weight: 500;
          }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="brand-title">Math & Science Care</h1>
          <p class="brand-tagline">Care with Logic, Intelligence for Excellence</p>
          <p class="brand-location">Agrabad, Chittagong</p>
          <div class="title-divider"></div>
          <div class="title">Official Class Exam Result Sheet</div>
          
          <div class="meta-grid">
            <div class="meta-item">Exam: <strong>${selectedExam.name}</strong></div>
            <div class="meta-item">Subject: <strong>${selectedExam.subject}</strong></div>
            <div class="meta-item">Class: <strong>${selectedExam.classLevel}</strong></div>
            <div class="meta-item">Total Marks: <strong>${selectedExam.totalMarks}</strong></div>
            <div class="meta-item">Exam Date: <strong>${formatExamDate(selectedExam.date)}${selectedExam.time ? ` (${formatExamTime(selectedExam.time)})` : ''}</strong></div>
            <div class="meta-item">Registered: <strong>${examAnalytics.totalRegistered}</strong></div>
            <div class="meta-item">Attended: <strong>${examAnalytics.gradedCount}</strong></div>
            <div class="meta-item">Average Mark: <strong>${examAnalytics.average}</strong></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 8%;" class="text-center">Roll</th>
              <th style="width: 25%;">Student Name</th>
              <th style="width: 25%;">Institution / School</th>
              <th style="width: 12%;" class="text-center">Marks Obtained</th>
              <th style="width: 10%;" class="text-center">Percentage</th>
              <th style="width: 10%;" class="text-center">Grade</th>
              <th style="width: 10%;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${fullClassResults.map(r => {
              let badgeClass = 'badge-pending';
              if (r.grade === 'A+') badgeClass = 'badge-aplus';
              else if (r.grade === 'A') badgeClass = 'badge-a';
              else if (r.grade === 'A-') badgeClass = 'badge-aminus';
              else if (r.grade === 'B') badgeClass = 'badge-b';
              else if (r.grade === 'C') badgeClass = 'badge-c';
              else if (r.grade === 'F') badgeClass = 'badge-f';
              else if (r.grade === 'Absent') badgeClass = 'badge-absent';

              return `
                <tr>
                  <td class="text-center font-bold">${r.roll}</td>
                  <td class="font-bold">${r.name}</td>
                  <td>${r.school}</td>
                  <td class="text-center font-bold" style="color: ${r.marks === 'Absent' ? '#b91c1c' : '#0f172a'}">${r.marks}</td>
                  <td class="text-center font-bold">${r.percentage}</td>
                  <td class="text-center"><span class="badge ${badgeClass}">${r.grade}</span></td>
                  <td>${r.remarks !== 'N/A' ? r.remarks : ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="signature-section">
          <div class="signature-box">Class Teacher Signature</div>
          <div class="signature-box">Director / Principal</div>
        </div>

        <div class="footer">
          Generated automatically via Math Science Care Academic Portal on ${new Date().toLocaleDateString()}.
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
                          <span className="text-[10px] font-mono text-slate-500">
                            {formatExamDate(exam.date)} {exam.time ? `• ${formatExamTime(exam.time)}` : ''}
                          </span>
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
                            onClick={(e) => handleDeleteExam(exam, e)}
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
                          {gradedCount > 0 && (
                            <button
                              onClick={(e) => handlePublishResults(exam, e)}
                              disabled={publishingExamId !== null}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-[10px] font-bold transition ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Publish Results & Send SMS"
                            >
                              <Send className="w-2.5 h-2.5" />
                              {publishingExamId === exam.id ? 'Sending...' : 'Publish & Send SMS'}
                            </button>
                          )}
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

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-emerald-400 active:scale-98 text-xs font-semibold rounded-xl shadow-md transition cursor-pointer"
                title="Download complete class result sheet as Excel/CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              
              <button
                onClick={handlePrintResultSheet}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-sky-400 active:scale-98 text-xs font-semibold rounded-xl shadow-md transition cursor-pointer"
                title="Print official report card / save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Sheet</span>
              </button>

              <button
                onClick={() => setActiveView('entry')}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-98 text-xs font-bold text-slate-950 rounded-xl shadow-lg transition cursor-pointer"
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
                    Of the {examAnalytics.totalRegistered} students registered in {selectedExam.classLevel}, {examAnalytics.gradedCount} attended this exam on {formatExamDate(selectedExam.date)}{selectedExam.time ? ` at ${formatExamTime(selectedExam.time)}` : ''}. The highest score recorded is <strong className="text-emerald-400 font-mono">{examAnalytics.highest}</strong> out of {selectedExam.totalMarks}. The overall pass rate is <strong className="text-sky-400">{examAnalytics.passPercentage}%</strong>.
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
                <label className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider block">Exam Name <span className="text-rose-500">*</span></label>
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
                  <label className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider block">Exam Type <span className="text-rose-500">*</span></label>
                  <select
                    value={examForm.type}
                    onChange={(e) => setExamForm({ ...examForm, type: e.target.value as 'Weekly' | 'Monthly' | '' })}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">-- সিলেক্ট করুন --</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>

                {/* Class */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider block">Target Class <span className="text-rose-500">*</span></label>
                  <select
                    value={examForm.classLevel}
                    onChange={(e) => setExamForm({ ...examForm, classLevel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">-- সিলেক্ট করুন --</option>
                    {classLevelsList.map(cl => (
                      <option key={cl} value={cl}>{cl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider block">Subject / Chapter <span className="text-rose-500">*</span></label>
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
                  <label className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider block">Total Marks <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    placeholder="e.g. 100"
                    value={examForm.totalMarks}
                    onChange={(e) => setExamForm({ ...examForm, totalMarks: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider block">Exam Date <span className="text-rose-500">*</span></label>
                    <span className="text-emerald-400 font-mono text-[10px] font-bold">
                      {(() => {
                        if (!examForm.date) return '';
                        const parts = examForm.date.split('-');
                        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                        return examForm.date;
                      })()}
                    </span>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="date"
                      value={examForm.date}
                      onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none [color-scheme:dark]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider block">Exam Time <span className="text-rose-500">*</span></label>
                  <input
                    type="time"
                    value={examForm.time}
                    onChange={(e) => setExamForm({ ...examForm, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none [color-scheme:dark]"
                    required
                  />
                </div>
              </div>

              {/* Question PDF Upload */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider block">
                  Question Paper (PDF) <span className="text-rose-500">*</span>
                </label>
                <div className="relative group border border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-3 bg-slate-950/40 transition">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
                          showToast('শুধুমাত্র PDF ফাইল আপলোড করা যাবে!', 'error');
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          showToast('ফাইলের সাইজ ৫ মেগাবাইটের (5MB) নিচে হতে হবে!', 'error');
                          return;
                        }
                        setQuestionFile(file);
                        showToast(`"${file.name}" সফলভাবে সিলেক্ট করা হয়েছে!`, 'success');
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center text-center space-y-1.5 py-1">
                    <FileText className={`w-6 h-6 ${questionFile ? 'text-emerald-400' : 'text-slate-500 group-hover:text-amber-400'} transition`} />
                    {questionFile ? (
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-medium text-emerald-400 line-clamp-1">{questionFile.name}</p>
                        <p className="text-[9px] font-mono text-slate-500">{(questionFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-medium text-slate-300">প্রশ্নপত্রের PDF সিলেক্ট করুন</p>
                        <p className="text-[9px] font-mono text-slate-500">PDF format only • Max 5MB</p>
                      </div>
                    )}
                  </div>
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
                  disabled={!editingExam && (!examForm.name || !examForm.type || !examForm.classLevel || !examForm.subject || examForm.totalMarks === '' || !examForm.date || !examForm.time || !questionFile)}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingExam ? 'Save Changes' : 'Create Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION DIALOG */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="p-5 border-b border-slate-800 bg-slate-950/40">
              <h3 className="text-sm font-black text-rose-500 flex items-center gap-2">
                <span>⚠️ পরীক্ষা মুছে ফেলার সতর্কতা (Confirm Exam Deletion)</span>
              </h3>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                আপনি কি নিশ্চিতভাবে <strong className="text-amber-400">"{examToDelete.name}"</strong> পরীক্ষাটি এবং এর সাথে যুক্ত সকল শিক্ষার্থীর প্রাপ্ত নম্বর/মার্কস চিরতরে মুছে ফেলতে চান?
              </p>
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-[10px] text-rose-400 font-semibold leading-relaxed">
                সতর্কতা: এই কাজটি আর ফিরিয়ে আনা সম্ভব নয়। সকল নম্বর এবং ডেটা চিরতরে হারিয়ে যাবে।
              </div>
            </div>

            <div className="p-5 bg-slate-950/40 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                বাতিল করুন (Cancel)
              </button>
              <button
                type="button"
                onClick={executeDeleteExam}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-slate-100 text-xs font-black rounded-xl shadow-lg transition cursor-pointer"
              >
                হ্যাঁ, মুছে ফেলুন (Delete)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
