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
  Lock,
  MessageSquare,
  Copy,
  X
} from 'lucide-react';

export default function AttendanceView() {
  const { students, attendance, saveAttendanceRecords, showToast, adminPassword, addSmsLog, settings } = useApp();

  const getTodayStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [activeTab, setActiveTab] = useState<'take' | 'history' | 'monthly_report'>('take');

  // Monthly progress report states
  const [reportingMonth, setReportingMonth] = useState<number>(new Date().getMonth());
  const [reportingYear, setReportingYear] = useState<number>(new Date().getFullYear());
  const [isSendingReports, setIsSendingReports] = useState<boolean>(false);
  const [sendingProgress, setSendingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [showReportConfirm, setShowReportConfirm] = useState<boolean>(false);
  
  // State for batch-wise selection (by time slot)
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  // Local state for taking attendance: studentId -> status (only used for pending changes before submit)
  const [localRecords, setLocalRecords] = useState<Record<string, AttendanceStatus>>({});

  // State for manual SMS modal popup
  const [smsModalStudent, setSmsModalStudent] = useState<{
    student: any;
    status: AttendanceStatus;
  } | null>(null);



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
    if (isWeekend) {
      showToast('ছুটির দিনে (শুক্রবার ও শনিবার) হাজিরা পরিবর্তন করা যাবে না!');
      return;
    }
    // Prevent changing if already submitted (locked)
    const isAlreadySubmitted = attendance.some((att) => att.studentId === studentId && att.date === selectedDate);
    if (isAlreadySubmitted) {
      showToast('This attendance is submitted and locked!');
      return;
    }
    setLocalRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAllPresent = () => {
    if (isWeekend) {
      showToast('ছুটির দিনে (শুক্রবার ও শনিবার) হাজিরা পরিবর্তন করা যাবে না!');
      return;
    }
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

  const getFormattedDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch {}
    return dateStr;
  };

  const sendAutomatedSMS = async (
    studentName: string,
    status: AttendanceStatus,
    fatherPhone: string,
    motherPhone: string
  ) => {
    // Only send automated SMS for Present and Absent as per specifications
    if (status !== AttendanceStatus.Present && status !== AttendanceStatus.Absent) {
      return;
    }

    const current_date = getFormattedDate(selectedDate);
    const messageText = status === AttendanceStatus.Present
      ? `প্রিয় অভিভাবক,\nআজ ${current_date} \"শিক্ষার্থী ${studentName}\" \"Math & Science Care\"-এর নির্ধারিত ক্লাসে উপস্থিত ছিল। ধন্যবাদ।`
      : `প্রিয় অভিভাবক,\nআজ ${current_date} \"শিক্ষার্থী ${studentName}\" \"Math & Science Care\"-এর নির্ধারিত ক্লাসে উপস্থিত ছিল না। অনুগ্রহ করে বিষয়টি খেয়াল করুন।\nযোগাযোগ: 01984428632`;

    // Standardize/Clean Bangladeshi mobile numbers (exactly 11 digits starting with '01')
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

    const fatherCleaned = cleanPhoneNumber(fatherPhone);
    const motherCleaned = cleanPhoneNumber(motherPhone);

    const rawPhones = [fatherPhone, motherPhone];
    const validPhones = Array.from(new Set(rawPhones.map(cleanPhoneNumber).filter(p => p.length === 11 && p.startsWith('01'))));

    if (validPhones.length === 0) {
      return;
    }

    // Trigger separate independent fetch requests to guarantee delivery to both parents
    for (const phone of validPhones) {
      const recipientRole = phone === fatherCleaned ? 'Father' : 'Mother';
      let smsStatus: 'Success' | 'Failed' = 'Failed';
      let responseRaw = '';

      if (settings.smsServiceEnabled === false) {
        console.log("SMS service is disabled in settings. Skipping daily attendance SMS dispatch.");
        addSmsLog({
          student_name: studentName,
          recipient_role: recipientRole,
          phone_number: phone,
          message_type: status === AttendanceStatus.Present ? 'Attendance (Present)' : 'Attendance (Absent)',
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
            smsStatus = 'Success';
            showToast('🚀 অভিভাবককে অটোমেটিক SMS পাঠানো হয়েছে!');
            console.log(`✓ Automated SMS successfully sent to ${phone}`, data);
          } else {
            console.error(`✗ Automated SMS failed for number ${phone}:`, data.error || data);
          }
        } else {
          const errText = await response.text();
          responseRaw = errText;
          console.error(`✗ Automated SMS network response failed for number ${phone}:`, errText);
        }
      } catch (err) {
        responseRaw = err instanceof Error ? err.message : String(err);
        console.error(`✗ Failed to send automated SMS to ${phone}:`, err);
      } finally {
        addSmsLog({
          student_name: studentName,
          recipient_role: recipientRole,
          phone_number: phone,
          message_type: status === AttendanceStatus.Present ? 'Attendance (Present)' : 'Attendance (Absent)',
          message_content: messageText,
          status: smsStatus,
          response_raw: responseRaw,
        });
      }
    }
  };

  const handleSingleSave = (studentId: string, studentName: string) => {
    if (isWeekend) {
      showToast('ছুটির দিনে (শুক্রবার ও শনিবার) হাজিরা সাবমিট করা যাবে না!');
      return;
    }
    const statusToSave = localRecords[studentId] || AttendanceStatus.Present;
    saveAttendanceRecords(selectedDate, [{
      date: selectedDate,
      studentId: studentId,
      status: statusToSave,
    }]);
    
    showToast(`${studentName} এর উপস্থিতি সফলভাবে সাবমিট করা হয়েছে (${statusToSave === AttendanceStatus.Present ? 'উপস্থিত' : 'অনুপস্থিত'})!`);

    const student = students.find((st) => st.id === studentId);
    if (student) {
      const father_phone = student.fathersPhone || student.parentPhone || '';
      const mother_phone = student.mothersPhone || '';
      // Dispatch automated SMS quietly in the background
      sendAutomatedSMS(studentName, statusToSave, father_phone, mother_phone);
    }
  };

  // Helper to map month index to Bengali name
  const getBengaliMonthName = (monthIndex: number): string => {
    const months = [
      "জানুয়ারি",
      "ফেব্রুয়ারি",
      "মার্চ",
      "এপ্রিল",
      "মে",
      "জুন",
      "জুলাই",
      "আগস্ট",
      "সেপ্টেম্বর",
      "অক্টোবর",
      "নভেম্বর",
      "ডিসেম্বর"
    ];
    return months[monthIndex] || "";
  };

  const sendMonthlyReport = async (student: any, messageContent: string) => {
    const fatherPhone = student.fathersPhone || student.parentPhone || '';
    const motherPhone = student.mothersPhone || '';

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
      return { success: false, error: 'No valid parent phone number' };
    }

    if (settings.smsServiceEnabled === false) {
      showToast('⚠️ SMS সার্ভিস বর্তমানে বন্ধ রয়েছে। SMS পাঠাতে প্রথমে সার্ভিস চালু করুন।', 'warning');
      return { success: false, error: 'SMS service disabled by administrator' };
    }

    const promises = validPhones.map(async (phone) => {
      const recipientRole = phone === fatherCleaned ? 'Father' : 'Mother';
      let status: 'Success' | 'Failed' = 'Failed';
      let responseRaw = '';

      try {
        const payload = new URLSearchParams({
          msisdn: phone,
          smstext: messageContent,
          smsformat: "8"
        });

        const response = await fetch('/api/send-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Admin-Password': adminPassword
          },
          body: payload.toString()
        });

        responseRaw = `HTTP ${response.status}`;
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        responseRaw = JSON.stringify(data);
        if (!data.success) {
          throw new Error(data.error || 'Server error status');
        }
        status = 'Success';
        return phone;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Network error';
        responseRaw = responseRaw || errMsg;
        console.error(`Error sending monthly SMS to ${phone}:`, errMsg);
        throw err;
      } finally {
        addSmsLog({
          student_name: student.name,
          recipient_role: recipientRole,
          phone_number: phone,
          message_type: 'Monthly Report',
          message_content: messageContent,
          status,
          response_raw: responseRaw,
        });
      }
    });

    try {
      const results = await Promise.allSettled(promises);
      const succeeded = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<string>).value);
      if (succeeded.length > 0) {
        return { success: true, phones: succeeded };
      } else {
        return { success: false, error: 'All phone dispatches failed' };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown' };
    }
  };

  const triggerBulkMonthlyReports = async () => {
    if (activeStudents.length === 0) {
      showToast('কোনো সক্রিয় শিক্ষার্থী পাওয়া যায়নি!');
      return;
    }

    setIsSendingReports(true);
    setSendingProgress({ current: 0, total: activeStudents.length });
    setShowReportConfirm(false);

    const monthName = getBengaliMonthName(reportingMonth);
    let successCount = 0;
    let failCount = 0;
    let processed = 0;

    // Send dispatches quietly in background without halting the browser or resetting forms
    for (const student of activeStudents) {
      // Calculate attendance metrics
      const studentMonthRecords = attendance.filter(
        (r) => r.studentId === student.id && r.date.startsWith(`${reportingYear}-${String(reportingMonth + 1).padStart(2, '0')}-`)
      );
      const totalClasses = studentMonthRecords.length;
      const presentCount = studentMonthRecords.filter(
        (r) => r.status === AttendanceStatus.Present || r.status === AttendanceStatus.Late
      ).length;
      const absentCount = studentMonthRecords.filter(
        (r) => r.status === AttendanceStatus.Absent
      ).length;

      const studentName = student.nameBangla || student.name;
      const messageContent = `আসসালামু আলাইকুম।\nপ্রিয় অভিভাবক,\n${monthName} ${reportingYear} মাসে \"শিক্ষার্থী ${studentName}\"-এর উপস্থিতির সারসংক্ষেপ:\n• মোট ক্লাস: ${totalClasses}টি\n• উপস্থিত: ${presentCount}টি\n• অনুপস্থিত: ${absentCount}টি\nশিক্ষার্থীর নিয়মিত উপস্থিতি ও পড়াশোনায় সহযোগিতার জন্য আন্তরিক ধন্যবাদ।\nঅনুগ্রহ করে ${monthName} মাসের টিউশন ফি যথারীতি সময়ে পরিশোধ করার জন্য বিনীত অনুরোধ রইল।\nধন্যবাদান্তে,\nMath & Science Care`;

      try {
        const result = await sendMonthlyReport(student, messageContent);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err: unknown) {
        failCount++;
        console.error(`Quiet dispatch error for ${student.name}:`, err);
      }

      processed++;
      setSendingProgress({ current: processed, total: activeStudents.length });
    }

    setIsSendingReports(false);
    showToast(`🎉 মাসিক রিপোর্ট পাঠানো শেষ! সফল: ${successCount}, ব্যর্থ: ${failCount}`);
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
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide everything on the page by default */
          body * {
            visibility: hidden !important;
          }
          
          /* Reset ALL full-screen and overflow-hidden parent containers during print to allow proper rendering */
          html, body, #root, #root > div, main {
            height: auto !important;
            width: auto !important;
            overflow: visible !important;
            position: static !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            transform: none !important;
            backdrop-filter: none !important;
          }

          /* Show ONLY our printable register container and its contents */
          #printable-register-container, #printable-register-container * {
            visibility: visible !important;
          }
          /* Reset position and styling for print media */
          #printable-register-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
          }
          /* Webkit print adjustments to ensure high-contrast backgrounds */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
          }
          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 6px 10px !important;
            text-align: left !important;
            color: #000000 !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
        }
      `}} />
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
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 focus-within:border-emerald-500/40 rounded-xl px-3 py-1.5">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer font-mono"
          />
          <span className="text-[10px] text-emerald-400 font-mono pl-1.5 border-l border-slate-800 select-none">
            {getFormattedDate(selectedDate)}
          </span>
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
        <button
          onClick={() => setActiveTab('monthly_report')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'monthly_report'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Monthly Progress Reports
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-center animate-fade-in">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                {selectedBatch ? `${selectedBatch} Rate` : 'Overall Rate'}
              </span>
              <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">{attendanceRate}%</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-center animate-fade-in">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Present</span>
              <span className="text-2xl font-bold text-slate-200 font-mono mt-1 block">{countPresent}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-center animate-fade-in">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Absent</span>
              <span className="text-2xl font-bold text-rose-400 font-mono mt-1 block">{countAbsent}</span>
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
                    disabled={isWeekend}
                    onClick={handleMarkAllPresent}
                    className={`w-full sm:w-auto px-3.5 py-1.5 border text-xs font-bold rounded-lg transition text-left ${
                      isWeekend
                        ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-55'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700/60 text-slate-300 cursor-pointer'
                    }`}
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
                                  disabled={isSubmitted || isWeekend}
                                  onClick={() => handleStatusChange(s.id, AttendanceStatus.Present)}
                                  className={`flex-1 py-1 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    (isSubmitted || isWeekend) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                  } ${
                                    currentStatus === AttendanceStatus.Present
                                      ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  Present
                                </button>
                                {/* Absent Button */}
                                <button
                                  disabled={isSubmitted || isWeekend}
                                  onClick={() => handleStatusChange(s.id, AttendanceStatus.Absent)}
                                  className={`flex-1 py-1 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    (isSubmitted || isWeekend) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                  } ${
                                    currentStatus === AttendanceStatus.Absent
                                      ? 'bg-rose-500 text-slate-950 shadow-md font-extrabold'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              {isSubmitted ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 py-1 px-2.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-bold rounded-lg text-[10px] uppercase tracking-wide select-none">
                                    <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Locked
                                  </span>
                                  <button
                                    onClick={() => {
                                      setSmsModalStudent({
                                        student: s,
                                        status: currentStatus,
                                      });
                                    }}
                                    className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-lg border border-slate-700 transition cursor-pointer"
                                    title="Send Manual SMS"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  disabled={isWeekend}
                                  onClick={() => handleSingleSave(s.id, s.name)}
                                  className={`w-full py-1 px-2.5 font-bold rounded-lg text-[10px] uppercase tracking-wider shadow-md transition-all inline-flex items-center justify-center gap-1 ${
                                    isWeekend
                                      ? 'bg-slate-800/60 border border-slate-700/30 text-slate-500 cursor-not-allowed opacity-50'
                                      : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 active:scale-95 cursor-pointer'
                                  }`}
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
                        <p className="text-xs font-bold">{getFormattedDate(dt)}</p>
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
                Inspection: Register Sheet ({getFormattedDate(selectedDate)})
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

      {activeTab === 'monthly_report' && (() => {
        const monthsList = [
          { value: 0, label: "জানুয়ারি (January)" },
          { value: 1, label: "ফেব্রুয়ারি (February)" },
          { value: 2, label: "মার্চ (March)" },
          { value: 3, label: "এপ্রিল (April)" },
          { value: 4, label: "মে (May)" },
          { value: 5, label: "জুন (June)" },
          { value: 6, label: "জুলাই (July)" },
          { value: 7, label: "আগস্ট (August)" },
          { value: 8, label: "সেপ্টেম্বর (September)" },
          { value: 9, label: "অক্টোবর (October)" },
          { value: 10, label: "নভেম্বর (November)" },
          { value: 11, label: "ডিসেম্বর (December)" },
        ];

        const yearsList = [2024, 2025, 2026, 2027, 2028];

        const getStudentStatsForMonth = (studentId: string) => {
          const studentMonthRecords = attendance.filter(
            (r) => r.studentId === studentId && r.date.startsWith(`${reportingYear}-${String(reportingMonth + 1).padStart(2, '0')}-`)
          );
          const totalClasses = studentMonthRecords.length;
          const presentCount = studentMonthRecords.filter(
            (r) => r.status === AttendanceStatus.Present || r.status === AttendanceStatus.Late
          ).length;
          const absentCount = studentMonthRecords.filter(
            (r) => r.status === AttendanceStatus.Absent
          ).length;

          return { totalClasses, presentCount, absentCount };
        };

        const previewStudent = activeStudents[0];
        const previewStats = previewStudent ? getStudentStatsForMonth(previewStudent.id) : { totalClasses: 0, presentCount: 0, absentCount: 0 };
        const previewMessage = previewStudent
          ? `আসসালামু আলাইকুম।\nপ্রিয় অভিভাবক,\n${getBengaliMonthName(reportingMonth)} ${reportingYear} মাসে \"শিক্ষার্থী ${previewStudent.nameBangla || previewStudent.name}\"-এর উপস্থিতির সারসংক্ষেপ:\n• মোট ক্লাস: ${previewStats.totalClasses}টি\n• উপস্থিত: ${previewStats.presentCount}টি\n• অনুপস্থিত: ${previewStats.absentCount}টি\nশিক্ষার্থীর নিয়মিত উপস্থিতি ও পড়াশোনায় সহযোগিতার জন্য আন্তরিক ধন্যবাদ।\nঅনুগ্রহ করে ${getBengaliMonthName(reportingMonth)} মাসের টিউশন ফি যথারীতি সময়ে পরিশোধ করার জন্য বিনীত অনুরোধ রইল।\nধন্যবাদান্তে,\nMath & Science Care`
          : '';

        const todayDate = new Date();
        const tomorrowDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1);
        const isLastDayOfMonth = tomorrowDate.getDate() === 1;
        const isActionAllowed = isLastDayOfMonth;

        return (
          <div className="space-y-6 animate-fade-in text-left">
            {/* Card header */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>মাসিক রিপোর্ট ও উপস্থিতি প্রেরণ (Monthly Progress SMS Report)</span>
                  </h3>
                  <p className="text-slate-400 text-xs">
                    নির্দিষ্ট মাসের জন্য শিক্ষার্থীদের ক্লাসের উপস্থিতি পরিসংখ্যান হিসাব করে সরাসরি অভিভাবকদের মোবাইলে SMS পাঠান।
                  </p>
                </div>

                {/* Month / Year selection */}
                <div className="flex items-center gap-2">
                  <select
                    value={reportingMonth}
                    onChange={(e) => setReportingMonth(Number(e.target.value))}
                    disabled={isSendingReports}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-emerald-500/40"
                  >
                    {monthsList.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={reportingYear}
                    onChange={(e) => setReportingYear(Number(e.target.value))}
                    disabled={isSendingReports}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-emerald-500/40"
                  >
                    {yearsList.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Strict Last Day of Month restriction notice */}
              {!isActionAllowed && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-slate-300 leading-relaxed">
                  <strong className="text-rose-400 block font-bold mb-1">⚠️ রিপোর্ট প্রেরণ নিষ্ক্রিয় (System Lock):</strong>
                  <span>এই ফিচারটি শুধুমাত্র মাসের শেষ দিন স্বয়ংক্রিয়ভাবে সক্রিয় হবে। আজকে মাসের শেষ দিন নয়।</span>
                </div>
              )}

              {isLastDayOfMonth && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-slate-300 leading-relaxed">
                  <strong className="text-emerald-400">📅 মাসের শেষ দিন সক্রিয়:</strong> আজকে মাসের শেষ দিন, তাই রিপোর্ট প্রেরণ ব্যবস্থা সক্রিয় রয়েছে।
                </div>
              )}

              {/* Warning / Notes */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-slate-300 leading-relaxed">
                <strong>💡 নির্দেশনা:</strong> এই ফিচারটি স্বয়ংক্রিয়ভাবে নির্বাচিত মাসের <strong>মোট ক্লাস সংখ্যা</strong>, <strong>উপস্থিতি</strong> ও <strong>অনুপস্থিতি</strong> হিসাব করে এবং Bengali Unicode ফরম্যাটে অভিভাবকদের ফোন নম্বরে একসাথে প্রেরণ করে। (প্রতিটি শিক্ষার্থীর বাবা এবং মা উভয়ের নম্বরেই আলাদাভাবে প্রেরণ করা হবে)।
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left/Middle Column: Students list and calculations */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-300">শিক্ষার্থীদের উপস্থিতি হিসাব ({getBengaliMonthName(reportingMonth)} {reportingYear})</h4>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 text-slate-400 rounded-lg">
                      সক্রিয় শিক্ষার্থী: {activeStudents.length} জন
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3 w-16 text-center">রোল</th>
                          <th className="p-3">শিক্ষার্থীর নাম</th>
                          <th className="p-3 text-center">মোট ক্লাস</th>
                          <th className="p-3 text-center">উপস্থিত</th>
                          <th className="p-3 text-center">অনুপস্থিত</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {activeStudents.map((s) => {
                          const stats = getStudentStatsForMonth(s.id);
                          return (
                            <tr key={s.id} className="hover:bg-slate-900/20 transition-colors">
                              <td className="p-3 text-center font-mono font-bold text-slate-400">{s.roll}</td>
                              <td className="p-3">
                                <span className="font-bold text-slate-200 block">{s.name}</span>
                                {s.nameBangla && (
                                  <span className="text-[10px] text-slate-500 font-normal">{s.nameBangla}</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-slate-300">{stats.totalClasses}টি</td>
                              <td className="p-3 text-center font-mono font-bold text-emerald-400">{stats.presentCount}টি</td>
                              <td className="p-3 text-center font-mono font-bold text-rose-400">{stats.absentCount}টি</td>
                            </tr>
                          );
                        })}

                        {activeStudents.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">
                              কোনো সক্রিয় শিক্ষার্থী পাওয়া যায়নি।
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Template Preview and Dispatch CTA */}
              <div className="space-y-4">
                {/* Message template preview */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold text-slate-300">বার্তা প্রিভিউ (SMS Preview)</h4>
                    <span className="text-[9px] bg-slate-800/80 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-bold">Unicode Format</span>
                  </div>

                  {previewStudent ? (
                    <div className="space-y-3">
                      <p className="text-[10px] text-slate-500">
                        নিচে প্রথম শিক্ষার্থী <strong>{previewStudent.name}</strong>-এর জন্য তৈরি হওয়া বার্তার খসড়া দেখানো হলো:
                      </p>
                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap select-all">
                        {previewMessage}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-4 text-center">বার্তা প্রিভিউ দেখতে কোনো সক্রিয় শিক্ষার্থী নেই।</p>
                  )}
                </div>

                {/* Action Box */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300">বার্তা প্রেরণ কার্যক্রম (Report Dispatch)</h4>

                  {isSendingReports ? (
                    <div className="space-y-3 p-2 border border-emerald-500/20 bg-emerald-500/5 rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-bold animate-pulse flex items-center gap-1.5">
                          <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                          রিপোর্ট পাঠানো হচ্ছে...
                        </span>
                        <span className="text-slate-400 font-mono font-semibold">
                          {sendingProgress.current} / {sendingProgress.total}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(sendingProgress.current / (sendingProgress.total || 1)) * 100}%` }}
                        ></div>
                      </div>

                      <p className="text-[10px] text-slate-500 text-center leading-normal">
                        ব্যাকগ্রাউন্ডে স্বয়ংক্রিয়ভাবে মেসেজ প্রেরণ করা হচ্ছে। দয়া করে এই ট্যাব বন্ধ করবেন না এবং সম্পূর্ণ কার্যক্রম শেষ হওয়া পর্যন্ত অপেক্ষা করুন।
                      </p>
                    </div>
                  ) : (
                    <button
                      disabled={!isActionAllowed}
                      onClick={() => setShowReportConfirm(true)}
                      className={`w-full py-3 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition duration-150 text-center font-bold ${
                        isActionAllowed
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 hover:shadow-emerald-500/10 active:scale-98 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {isActionAllowed ? "মাসিক রিপোর্ট পাঠান (Send Reports)" : "রিপোর্ট লকড (মাসের শেষ দিনে সক্রিয় হবে)"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Confirm Send Modal */}
            {showReportConfirm && (
              <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2.5 text-amber-400">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-500/20">
                      !
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-100">প্রেরণ নিশ্চিতকরণ (Confirm Bulk SMS Send)</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">মাসিক রিপোর্ট বাল্ক মেসেজ প্রেরণ করতে যাচ্ছেন</p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                    <p>
                      আপনি কি নিশ্চিতভাবে <strong>{getBengaliMonthName(reportingMonth)} {reportingYear}</strong> মাসের রিপোর্ট সক্রিয় সকল <strong>{activeStudents.length}</strong> শিক্ষার্থীর অভিভাবকদের কাছে পাঠাতে চান?
                    </p>
                    <p className="text-slate-400 text-[10px] bg-slate-950 p-2.5 border border-slate-850 rounded-lg">
                      <strong>⚠️ সতর্কতা:</strong> এর ফলে প্রতিটি শিক্ষার্থীর জন্য বাবা এবং মা উভয়ের মোবাইলে আলাদাভাবে SMS প্রেরণ করা হবে। এতে কিছু সময় লাগতে পারে।
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowReportConfirm(false)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
                    >
                      বাতিল (Cancel)
                    </button>
                    <button
                      onClick={triggerBulkMonthlyReports}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer text-center font-bold"
                    >
                      হ্যাঁ, পাঠান (Yes, Send)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Hidden Printable Container for Register Sheet */}
      <div id="printable-register-container" className="hidden print:block text-slate-900 bg-white p-6 space-y-6">
        {/* Standard Brand Header */}
        <div className="text-center space-y-1 pb-4 border-b-2 border-slate-200">
          <h1 className="text-3xl font-bold font-serif text-black leading-tight" style={{ fontFamily: "Georgia, serif" }}>
            Math & Science Care
          </h1>
          <p className="text-sm italic font-serif text-slate-700" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
            Care with Logic, Intelligence for Excellence
          </p>
          <p className="text-sm font-serif text-slate-700 underline" style={{ fontFamily: "Georgia, serif" }}>
            Agrabad, Chittagong
          </p>
        </div>
        
        <div className="space-y-2 mt-4 text-center">
          <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">Student Attendance Register</h2>
          <p className="text-xs text-slate-500 font-medium">Date: {selectedDate} | Batch Time: {selectedBatch || 'Flexible Hours'}</p>
        </div>

        <table className="w-full text-left text-xs border border-slate-300">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-black font-bold">
              <th className="p-3 border border-slate-300 text-center w-16">Roll</th>
              <th className="p-3 border border-slate-300">Student Name</th>
              <th className="p-3 border border-slate-300">Class Level</th>
              <th className="p-3 border border-slate-300">School</th>
              <th className="p-3 border border-slate-300 text-center w-36">Status</th>
            </tr>
          </thead>
          <tbody>
            {currentBatchStudents.map((s) => {
              const currentStatus = getStudentStatus(s.id);
              return (
                <tr key={s.id} className="border-b border-slate-200 text-slate-800">
                  <td className="p-3 border border-slate-300 text-center font-bold">{s.roll}</td>
                  <td className="p-3 border border-slate-300 font-semibold">
                    {s.name}
                    {s.nameBangla && (
                      <span className="block text-[10px] text-slate-500 font-normal mt-0.5 font-bengali">
                        {s.nameBangla}
                      </span>
                    )}
                  </td>
                  <td className="p-3 border border-slate-300">{s.classLevel}</td>
                  <td className="p-3 border border-slate-300">{s.school}</td>
                  <td className="p-3 border border-slate-300 text-center font-bold uppercase text-[10px]">
                    {currentStatus || 'Pending'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="flex justify-between mt-12 pt-12 border-t border-slate-100">
          <div className="border-t border-dashed border-slate-400 w-44 text-center text-xs pt-2 text-slate-600">
            Teacher Signature
          </div>
          <div className="border-t border-dashed border-slate-400 w-44 text-center text-xs pt-2 text-slate-600">
            Authorized Signature
          </div>
        </div>
      </div>

      {/* Manual SMS Modal */}
      {smsModalStudent && (() => {
        const student = smsModalStudent.student;
        const status = smsModalStudent.status;
        const studentName = student.nameBangla 
          ? `${student.name} (${student.nameBangla})` 
          : student.name;
        
        const fatherPhone = student.fathersPhone || student.parentPhone || '';
        const motherPhone = student.mothersPhone || '';

        const current_date = getFormattedDate(selectedDate);
        const messageText = status === AttendanceStatus.Present
          ? `প্রিয় অভিভাবক,\nআজ ${current_date} \"শিক্ষার্থী ${studentName}\" \"Math & Science Care\"-এর নির্ধারিত ক্লাসে উপস্থিত ছিল। ধন্যবাদ।`
          : `প্রিয় অভিভাবক,\nআজ ${current_date} \"শিক্ষার্থী ${studentName}\" \"Math & Science Care\"-এর নির্ধারিত ক্লাসে উপস্থিত ছিল না। অনুগ্রহ করে বিষয়টি খেয়াল করুন।\nযোগাযোগ: 01984428632`;

        const copyText = (text: string, successMessage: string) => {
          navigator.clipboard.writeText(text);
          showToast(successMessage);
        };

        const copyBothPhones = () => {
          const phones = [fatherPhone, motherPhone].map(p => p.trim()).filter(Boolean).join(',');
          if (phones) {
            copyText(phones, 'উভয় নম্বর কপি করা হয়েছে!');
          } else {
            showToast('কোনো নম্বর পাওয়া যায়নি!');
          }
        };

        return (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>অভিভাবককে ম্যানুয়ালি SMS পাঠান</span>
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    উপস্থিতি সাবমিট করা হয়েছে। নিচে থেকে নম্বর ও SMS কপি করে ম্যানুয়ালি পাঠান।
                  </p>
                </div>
                <button 
                  onClick={() => setSmsModalStudent(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4 overflow-y-auto">
                {/* Student info summary */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-[11px] space-y-1">
                  <p className="text-slate-400">শিক্ষার্থী: <strong className="text-slate-100">{studentName}</strong></p>
                  <p className="text-slate-400">রোল: <strong className="text-slate-100">{student.roll}</strong> • শ্রেণি: <strong className="text-slate-100">{student.classLevel}</strong></p>
                  <p className="text-slate-400">তারিখ: <strong className="text-slate-100">{current_date}</strong> • উপস্থিতি: <strong className={status === AttendanceStatus.Present ? 'text-emerald-400' : 'text-rose-400'}>{status === AttendanceStatus.Present ? 'উপস্থিত' : 'অনুপস্থিত'}</strong></p>
                </div>

                {/* Parents' numbers */}
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-0.5">অভিভাবকের মোবাইল নম্বরসমূহ:</p>
                  
                  {fatherPhone && (
                    <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">বাবার নম্বর (Father)</span>
                        <span className="font-mono text-xs font-bold text-slate-300 select-all">{fatherPhone}</span>
                      </div>
                      <button
                        onClick={() => copyText(fatherPhone, 'বাবার নম্বর কপি করা হয়েছে!')}
                        className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 text-slate-300 font-bold rounded-lg text-[9px] transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Copy className="w-3 h-3" /> কপি
                      </button>
                    </div>
                  )}

                  {motherPhone && (
                    <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">মায়ের নম্বর (Mother)</span>
                        <span className="font-mono text-xs font-bold text-slate-300 select-all">{motherPhone}</span>
                      </div>
                      <button
                        onClick={() => copyText(motherPhone, 'মায়ের নম্বর কপি করা হয়েছে!')}
                        className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 text-slate-300 font-bold rounded-lg text-[9px] transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Copy className="w-3 h-3" /> কপি
                      </button>
                    </div>
                  )}

                  {fatherPhone && motherPhone && (
                    <button
                      onClick={copyBothPhones}
                      className="w-full py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg text-center cursor-pointer hover:border-emerald-500/20 transition-all active:scale-95"
                    >
                      উভয় নম্বর একসাথে কপি করুন
                    </button>
                  )}
                </div>

                {/* SMS Text Box */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center pl-0.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SMS বার্তা বিবরণ:</p>
                    <button
                      onClick={() => copyText(messageText, 'SMS বার্তা কপি করা হয়েছে!')}
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> পুরো SMS কপি করুন
                    </button>
                  </div>
                  <textarea
                    readOnly
                    rows={4}
                    value={messageText}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 font-sans leading-relaxed focus:outline-none resize-none font-medium"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex gap-2">
                <button
                  onClick={() => setSmsModalStudent(null)}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider text-center active:scale-95 transition-all cursor-pointer"
                >
                  আমি SMS পাঠিয়েছি - নিশ্চিত করুন
                </button>
              </div>
            </div>
          </div>
        );
      })()}


    </div>
  );
}
