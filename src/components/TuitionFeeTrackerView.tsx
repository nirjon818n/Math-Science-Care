/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Coins, 
  Search, 
  Filter, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  ShieldCheck, 
  X,
  TrendingUp,
  User,
  Hash,
  Layers,
  Calendar,
  AlertTriangle,
  Printer,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../types';

const MONTHS_OPTIONS = [
  { value: '01', name: 'January (জানুয়ারি)' },
  { value: '02', name: 'February (ফেব্রুয়ারি)' },
  { value: '03', name: 'March (মার্চ)' },
  { value: '04', name: 'April (এপ্রিল)' },
  { value: '05', name: 'May (মে)' },
  { value: '06', name: 'June (জুন)' },
  { value: '07', name: 'July (জুলাই)' },
  { value: '08', name: 'August (আগস্ট)' },
  { value: '09', name: 'September (সেপ্টেম্বর)' },
  { value: '10', name: 'October (অক্টোবর)' },
  { value: '11', name: 'November (নভেম্বর)' },
  { value: '12', name: 'December (ডিসেম্বর)' },
];

const currentYearNum = new Date().getFullYear();
const YEARS_OPTIONS = Array.from({ length: 7 }, (_, i) => String(currentYearNum - 3 + i));

export default function TuitionFeeTrackerView() {
  const { 
    students, 
    feePayments, 
    updateFeePayments, 
    logAction, 
    showToast,
    settings,
    adminPassword,
    addSmsLog
  } = useApp();

  // Local state
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Confirmation Modal State
  const [confirmingStudent, setConfirmingStudent] = useState<Student | null>(null);
  const [confirmNameTyped, setConfirmNameTyped] = useState('');
  const [receivedAmount, setReceivedAmount] = useState<number | ''>('');
  const [modalPaymentMonth, setModalPaymentMonth] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);

  // View an already paid invoice
  const handleViewInvoice = (student: Student, payment: any) => {
    const year = payment.month.split('-')[0];
    const invoiceNum = `MSC-${year}-${String(student.roll).padStart(4, '0')}`;
    
    const payDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
    const payDay = String(payDate.getDate()).padStart(2, '0');
    const payMonth = String(payDate.getMonth() + 1).padStart(2, '0');
    const payYear = payDate.getFullYear();
    const dateTimeStr = `${payDay}/${payMonth}/${payYear} ` + payDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    setActiveInvoice({
      invoiceNumber: invoiceNum,
      dateTime: dateTimeStr,
      student: student,
      month: payment.month,
      amount: payment.amount || student.monthlyFee || 0,
      paidAmount: payment.paidAmount || payment.amount || 0,
      paymentDate: payment.paymentDate || '',
    });
  };

  // Check if the student has already paid for the selected modal payment month
  const isSelectedMonthAlreadyPaid = useMemo(() => {
    if (!confirmingStudent || !modalPaymentMonth) return false;
    return feePayments.some(
      p => p.studentId === confirmingStudent.id && p.month === modalPaymentMonth && p.status === 'Paid'
    );
  }, [confirmingStudent, modalPaymentMonth, feePayments]);

  // Dynamic filter lists
  const classesList = useMemo(() => {
    const list = Array.from(new Set(students.map(s => s.classLevel).filter(Boolean))) as string[];
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
    return ['All', ...sortedList];
  }, [students]);

  const batchesList = useMemo(() => {
    const list = students.map(s => s.batch).filter(Boolean);
    return ['All', ...Array.from(new Set(list))];
  }, [students]);

  // Statistics calculation for the SELECTED month
  const stats = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'Active');
    const totalExpected = activeStudents.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

    // Filter payments for this month
    const paymentsThisMonth = feePayments.filter(p => p.month === selectedMonth && p.status === 'Paid');
    const totalCollected = paymentsThisMonth.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const paidCount = paymentsThisMonth.length;
    const unpaidCount = Math.max(0, activeStudents.length - paidCount);

    const percent = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return {
      activeCount: activeStudents.length,
      totalExpected,
      totalCollected,
      totalPending: Math.max(0, totalExpected - totalCollected),
      percent,
      paidCount,
      unpaidCount
    };
  }, [students, feePayments, selectedMonth]);

  // Handle open confirming modal
  const [selectedTrackerMonth, setSelectedTrackerMonth] = useState<string>('');
  const handleInitiatePayment = (student: Student) => {
    setConfirmingStudent(student);
    setConfirmNameTyped('');
    setReceivedAmount('');
    setModalPaymentMonth('');
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setPaymentDate(`${d.getFullYear()}-${mm}-${dd}`);
  };

  // Confirm payment & lock
  const handleConfirmPayment = async () => {
    if (!confirmingStudent || !modalPaymentMonth) return;
    
    // Safety check - check name match
    if (confirmNameTyped.trim().toLowerCase() !== confirmingStudent.name.trim().toLowerCase()) {
      showToast('Student name does not match exactly! Please check spelling.', 'error');
      return;
    }

    if (isSelectedMonthAlreadyPaid) {
      showToast('This month is already paid and permanently locked!', 'error');
      return;
    }

    setIsSaving(true);

    const recordId = `fee-${confirmingStudent.id}-${modalPaymentMonth}`;
    const newPaymentRecord = {
      id: recordId,
      studentId: confirmingStudent.id,
      month: modalPaymentMonth,
      amount: confirmingStudent.monthlyFee || 0,
      paidAmount: receivedAmount === '' ? 0 : receivedAmount,
      status: 'Paid' as const,
      paymentDate: paymentDate,
    };

    // Append/Replace in payment list
    const updatedPayments = [...feePayments];
    const existingIndex = updatedPayments.findIndex(p => p.id === recordId);
    if (existingIndex !== -1) {
      updatedPayments[existingIndex] = newPaymentRecord;
    } else {
      updatedPayments.push(newPaymentRecord);
    }

    const success = await updateFeePayments(updatedPayments);
    setIsSaving(false);

    if (success) {
      showToast(`Payment of ৳${receivedAmount} recorded and permanently locked for ${confirmingStudent.name}!`, 'success');
      logAction(
        'Tuition Fees',
        'Fee Locked',
        `Recorded & locked tuition fee of ৳${receivedAmount} for ${confirmingStudent.name} (${modalPaymentMonth}). Name verification successful.`,
        'success'
      );

      // Extract phone details for SMS dispatch
      const fatherPhone = confirmingStudent.fathersPhone || confirmingStudent.parentPhone || '';
      const motherPhone = confirmingStudent.mothersPhone || '';

      const cleanPhoneNumber = (phone: string): string => {
        if (!phone) return '';
        let cleaned = phone.replace(/[^0-9]/g, '');
        if (cleaned.startsWith('88')) {
          cleaned = cleaned.substring(2);
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

      const getBengaliMonthOnly = (monthNum: string) => {
        const map: Record<string, string> = {
          '01': 'জানুয়ারি',
          '02': 'ফেব্রুয়ারি',
          '03': 'মার্চ',
          '04': 'এপ্রিল',
          '05': 'মে',
          '06': 'জুন',
          '07': 'জুলাই',
          '08': 'আগস্ট',
          '09': 'সেপ্টেম্বর',
          '10': 'অক্টোবর',
          '11': 'নভেম্বর',
          '12': 'ডিসেম্বর'
        };
        return map[monthNum] || '';
      };

      const mParts = modalPaymentMonth.split('-');
      const monthNum = mParts[1] || '';
      const yearStr = mParts[0] || '';
      const selectedMonthLabel = `${getBengaliMonthOnly(monthNum)} ${yearStr}`;

      const messageContent = `আসসালামু আলাইকুম।\nপ্রিয় অভিভাবক,\n\"শিক্ষার্থী ${confirmingStudent.name}\"-এর ${selectedMonthLabel} মাসের টিউশন ফি ৳${receivedAmount} সফলভাবে গ্রহণ করা হয়েছে।\nআপনার সহযোগিতার জন্য আন্তরিক ধন্যবাদ।\nধন্যবাদান্তে,\nMSCare Center`;

      // Dispatch parallel API requests
      validPhones.forEach(async (phone) => {
        const recipientRole = phone === fatherCleaned ? 'Father' : 'Mother';
        let smsStatus: 'Success' | 'Failed' = 'Failed';
        let responseRaw = '';

        if (settings.smsServiceEnabled === false) {
          console.log("SMS service is disabled in settings. Skipping tuition fee receipt SMS.");
          addSmsLog({
            student_name: confirmingStudent.name,
            recipient_role: recipientRole,
            phone_number: phone,
            message_type: 'Tuition Fee Receipt',
            message_content: messageContent,
            status: 'Failed',
            response_raw: 'SMS service is disabled by administrator in settings',
          });
          return;
        }

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
          if (response.ok) {
            const data = await response.json();
            responseRaw = JSON.stringify(data);
            if (data.success) {
              smsStatus = 'Success';
              console.log(`✓ Tuition Fee Receipt SMS successfully sent to ${phone}`);
            } else {
              console.error(`✗ Automas API returned failure for ${phone}:`, data.error || 'Unknown error');
            }
          } else {
            const errText = await response.text();
            responseRaw = errText;
            console.error(`✗ Failed to send Tuition Fee Receipt SMS to ${phone} with status ${response.status}:`, errText);
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Unknown network/fetch error';
          responseRaw = responseRaw || errMsg;
          console.error(`✗ Error dispatching Tuition Fee Receipt SMS to ${phone}:`, errMsg);
        } finally {
          // Log into SMS Dashboard database
          addSmsLog({
            student_name: confirmingStudent.name,
            recipient_role: recipientRole,
            phone_number: phone,
            message_type: 'Tuition Fee Receipt',
            message_content: messageContent,
            status: smsStatus,
            response_raw: responseRaw,
          });
        }
      });
      
      const year = modalPaymentMonth.split('-')[0];
      const invoiceNum = `MSC-${year}-${String(confirmingStudent.roll).padStart(4, '0')}`;
      const now = new Date();
      const dateTimeStr = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) + ' ' + now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      setActiveInvoice({
        invoiceNumber: invoiceNum,
        dateTime: dateTimeStr,
        student: confirmingStudent,
        month: modalPaymentMonth,
        amount: confirmingStudent.monthlyFee || 0,
        paidAmount: receivedAmount,
        paymentDate: paymentDate,
      });

      setConfirmingStudent(null);
    } else {
      showToast('Failed to lock payment record. Please check database constraint.', 'error');
    }
  };

  // Filter students for display
  const filteredStudents = useMemo(() => {
    return students
      .filter(s => {
        const matchesSearch = 
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.nameBangla && s.nameBangla.includes(searchQuery)) ||
          s.roll.toString().includes(searchQuery) ||
          s.parentPhone.includes(searchQuery);

        const matchesClass = selectedClass === 'All' || s.classLevel === selectedClass;
        const matchesBatch = selectedBatch === 'All' || s.batch === selectedBatch;
        const matchesStatus = filterStatus === 'All' || s.status === filterStatus;

        return matchesSearch && matchesClass && matchesBatch && matchesStatus;
      })
      .sort((a, b) => parseInt(a.roll, 10) - parseInt(b.roll, 10));
  }, [students, searchQuery, selectedClass, selectedBatch, filterStatus]);

  // Translate month representation to Bangla
  const getMonthNameBangla = (monthStr: string) => {
    if (!monthStr) return 'সিলেক্ট করা হয়নি (Not Selected)';
    const parts = monthStr.split('-');
    if (parts.length < 2) return 'সিলেক্ট করা হয়নি (Not Selected)';
    const [year, monthNum] = parts;
    const months = [
      'January (জানুয়ারি)', 'February (ফেব্রুয়ারি)', 'March (মার্চ)', 'April (এপ্রিল)', 'May (মে)', 'June (জুন)',
      'July (জুলাই)', 'August (আগস্ট)', 'September (সেপ্টেম্বর)', 'October (অক্টোবর)', 'November (নভেম্বর)', 'December (ডিসেম্বর)'
    ];
    return `${months[parseInt(monthNum, 10) - 1] || 'Unknown'} ${year}`;
  };

  return (
    <div className="space-y-6 h-full flex flex-col min-h-0" id="tuition-fee-tracker-container">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            Tuition Fee Tracker (বেতন ট্র্যাকার)
          </h2>
          <p className="text-xs text-slate-400">
            Manage students tuition fees, track logs, and permanently secure collection records safely.
          </p>
        </div>

        {/* Month Picker Selection */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 whitespace-nowrap">Select Tracker Month:</label>
          <div className="flex items-center gap-1.5">
            {/* Month Dropdown */}
            <select
              value={selectedMonth.split('-')[1]}
              onChange={(e) => {
                const year = selectedMonth.split('-')[0];
                setSelectedMonth(`${year}-${e.target.value}`);
              }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {MONTHS_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>

            {/* Year Dropdown */}
            <select
              value={selectedMonth.split('-')[0]}
              onChange={(e) => {
                const month = selectedMonth.split('-')[1];
                setSelectedMonth(`${e.target.value}-${month}`);
              }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono cursor-pointer"
            >
              {YEARS_OPTIONS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid Stats Block */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Students</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-slate-200">{stats.activeCount}</span>
            <span className="text-[10px] text-slate-400">active ledger</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Expected Fees ({selectedMonth})</span>
          <div className="mt-2 flex items-baseline gap-1 text-indigo-400">
            <span className="text-2xl font-extrabold font-mono">৳{stats.totalExpected.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 p-2 opacity-5">
            <TrendingUp className="w-20 h-20 text-emerald-400" />
          </div>
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Total Collected
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-emerald-400">৳{stats.totalCollected.toLocaleString()}</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded">
              {stats.percent}%
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Pending Outstanding</span>
          <div className="mt-2 flex items-baseline gap-1 text-rose-400">
            <span className="text-2xl font-extrabold font-mono">৳{stats.totalPending.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar of Collections */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300">Monthly Budget Realization Progress (মোট আদায়ের অগ্রগতি)</span>
          <span className="font-mono font-bold text-emerald-400">{stats.percent}% Received</span>
        </div>
        <div className="h-2.5 w-full bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${stats.percent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>৳0</span>
          <span>Collected: ৳{stats.totalCollected.toLocaleString()} / ৳{stats.totalExpected.toLocaleString()}</span>
        </div>
      </div>

      {/* Filter and Search Bar controls */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        {/* Search */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Search className="w-3 h-3 text-slate-400" /> Search Students
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Type name, roll, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Class */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Filter Class/Level
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {classesList.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        {/* Filter Batch */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" /> Filter Batch
          </label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {batchesList.map(bt => (
              <option key={bt} value={bt}>{bt}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="All">All Students</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Main Student Ledgers Table List */}
      <div className="flex-1 bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-3.5 pl-5 w-20">Roll</th>
                <th className="p-3.5">Student Details</th>
                <th className="p-3.5">Batch & Class</th>
                <th className="p-3.5 text-right">Standard Monthly Fee</th>
                <th className="p-3.5 text-center">Status ({getMonthNameBangla(selectedMonth)})</th>
                <th className="p-3.5 text-center pr-5">Lock Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500">
                    No matching student records found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  // Find payment record for this month
                  const payment = feePayments.find(p => p.studentId === student.id && p.month === selectedMonth);
                  const isPaid = payment && payment.status === 'Paid';

                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-slate-900/30 transition ${isPaid ? 'bg-emerald-500/5' : ''}`}
                    >
                      {/* Roll */}
                      <td className="p-3.5 pl-5 font-mono font-bold text-slate-400">
                        #{student.roll}
                      </td>

                      {/* Name/Bangla name */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-200">{student.name}</div>
                        {student.nameBangla && (
                          <div className="text-[10px] text-slate-400">{student.nameBangla}</div>
                        )}
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">{student.parentPhone}</div>
                      </td>

                      {/* Class and Batch */}
                      <td className="p-3.5 space-y-0.5">
                        <div className="text-slate-300 font-medium">{student.classLevel}</div>
                        <div className="text-[10px] text-slate-500">{student.batch}</div>
                      </td>

                      {/* Fee */}
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400 text-sm">
                        ৳{(student.monthlyFee || 0).toLocaleString()}
                      </td>

                      {/* Paid badge Status */}
                      <td className="p-3.5 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[11px] font-black">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Paid (পরিশোধিত)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-400 border border-slate-700/50 rounded-xl text-[11px] font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-500" /> Unpaid (বকেয়া)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center pr-5">
                        {isPaid ? (
                          <div className="flex flex-col items-center gap-1.5 justify-center">
                            <div className="inline-flex items-center gap-1.5 text-emerald-400 text-[10px] font-mono font-semibold opacity-90">
                              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Permanently Locked
                            </div>
                            <button
                              onClick={() => handleViewInvoice(student, payment)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 text-slate-300 font-bold rounded-xl transition text-[9px] flex items-center gap-1 cursor-pointer shadow-sm border border-slate-700/50"
                            >
                              <FileText className="w-3 h-3 text-emerald-500" /> View Invoice
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleInitiatePayment(student)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl transition cursor-pointer text-[10px] flex items-center justify-center gap-1.5 mx-auto"
                          >
                            <Unlock className="w-3 h-3 text-emerald-200" /> Mark as Paid (টাকা গ্রহণ করুন)
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Lock Confirmation Modal */}
      <AnimatePresence>
        {confirmingStudent && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden"
            >
              <div className="p-6 space-y-4">
                {/* Shield Header */}
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-100">বেতন পরিশোধ নিশ্চিতকরণ (Tuition Payment Lock)</h3>
                    <p className="text-[10px] text-slate-400">Strict one-way audit validation system</p>
                  </div>
                  <button 
                    onClick={() => setConfirmingStudent(null)}
                    className="ml-auto p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Warnings */}
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5 text-rose-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black uppercase tracking-wider">পেমেন্ট লকিং সতর্কতা (Safety Warnings):</p>
                    <p className="text-[10px] text-slate-300 leading-normal">
                      একবার 'Paid' হিসেবে সেট করলে, এই তথ্যটি ডাটাবেজে <span className="text-rose-400 font-bold">চিরতরে লক হয়ে যাবে</span>। এটি আর পরিবর্তন, এডিট বা ডিলিট করা সম্ভব হবে না।
                    </p>
                  </div>
                </div>

                {/* Already Paid Warning */}
                {isSelectedMonthAlreadyPaid && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-amber-400">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-black uppercase tracking-wider">ইতিমধ্যেই পরিশোধিত (Already Locked):</p>
                      <p className="text-[10px] text-slate-300 leading-normal">
                        এই ছাত্রের জন্য <span className="text-emerald-400 font-bold">{getMonthNameBangla(modalPaymentMonth)}</span> মাসের বেতন ইতিমধ্যেই পরিশোধিত হিসেবে লক করা আছে। এটি আর পরিবর্তন বা পুনরায় জমা করা যাবে না।
                      </p>
                    </div>
                  </div>
                )}

                {/* Details list */}
                <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800 space-y-3">
                  <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-500">Student Name:</span>
                      <p className="font-bold text-slate-200">{confirmingStudent.name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Class & Roll:</span>
                      <p className="font-bold text-slate-200">{confirmingStudent.classLevel} (Roll #{confirmingStudent.roll})</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Selected Payment Month:</span>
                      <p className="font-bold text-emerald-400 font-mono">
                        {modalPaymentMonth ? getMonthNameBangla(modalPaymentMonth) : 'Not Selected'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Standard Base Fee:</span>
                      <p className="font-bold text-slate-300">৳{(confirmingStudent.monthlyFee || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Select Target Month & Year (কোন মাসের বেতন পরিশোধ করবেন)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Month Select */}
                        <select
                          value={modalPaymentMonth ? (modalPaymentMonth.split('-')[1] || '') : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                              setModalPaymentMonth('');
                            } else {
                              const year = modalPaymentMonth ? (modalPaymentMonth.split('-')[0] || String(new Date().getFullYear())) : String(new Date().getFullYear());
                              setModalPaymentMonth(`${year}-${val}`);
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="">-- মাস সিলেক্ট করুন --</option>
                          {MONTHS_OPTIONS.map(m => (
                            <option key={m.value} value={m.value}>{m.name}</option>
                          ))}
                        </select>

                        {/* Year Select */}
                        <select
                          value={modalPaymentMonth ? (modalPaymentMonth.split('-')[0] || '') : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                              setModalPaymentMonth('');
                            } else {
                              const month = modalPaymentMonth ? (modalPaymentMonth.split('-')[1] || '01') : '01';
                              setModalPaymentMonth(`${val}-${month}`);
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono cursor-pointer"
                        >
                          <option value="">-- বছর সিলেক্ট করুন --</option>
                          {YEARS_OPTIONS.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Received Amount (৳)</label>
                        <input
                          type="number"
                          value={receivedAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReceivedAmount(val === '' ? '' : Math.max(0, parseInt(val) || 0));
                          }}
                          placeholder="বেতন লিখুন"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Payment Date</label>
                          <span className="text-emerald-400 font-mono text-[10px] font-bold">
                            {(() => {
                              if (!paymentDate) return '';
                              const parts = paymentDate.split('-');
                              if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                              return paymentDate;
                            })()}
                          </span>
                        </div>
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation challenge */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    সুরক্ষা ভেরিফিকেশন: পরিশোধ করতে ছাত্রের নাম ইংরেজিতে হুবহু পুনরায় লিখুন:
                  </label>
                  <p 
                    className="text-[11px] font-mono font-black text-emerald-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center select-none"
                    onCopy={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
                  >
                    {confirmingStudent.name}
                  </p>
                  <input
                    type="text"
                    value={confirmNameTyped}
                    onChange={(e) => setConfirmNameTyped(e.target.value)}
                    placeholder="হুবহু নামটি এখানে টাইপ করুন (Case-sensitive)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 uppercase"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-950/60 border-t border-slate-800/60 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmingStudent(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition"
                >
                  বাতিল করুন (Cancel)
                </button>
                <button
                  type="button"
                  disabled={
                    isSaving || 
                    !modalPaymentMonth || 
                    modalPaymentMonth.split('-').some(p => !p) ||
                    receivedAmount === '' || 
                    isSelectedMonthAlreadyPaid || 
                    confirmNameTyped.trim().toLowerCase() !== confirmingStudent.name.trim().toLowerCase()
                  }
                  onClick={handleConfirmPayment}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-black rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-950/40 transition flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> Confirm & Permanently Lock (পরিশোধ লক করুন)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Modal Overlay */}
      <AnimatePresence>
        {activeInvoice && (
          <div className="invoice-modal-overlay fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                /* Hide everything on the page by default */
                body * {
                  visibility: hidden !important;
                }
                
                /* Reset ALL full-screen and overflow-hidden parent containers during print to allow proper rendering */
                html, body, #root, #root > div, main, .invoice-modal-overlay, .invoice-card-wrapper {
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

                /* Show ONLY our printable invoice container and its contents */
                #printable-invoice-container, #printable-invoice-container * {
                  visibility: visible !important;
                }

                /* Absolute position the invoice to the top of the printed page */
                #printable-invoice-container {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 30px !important;
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
              }
            `}} />

            <div className="invoice-card-wrapper relative max-w-2xl w-full bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-8">
              
              {/* Actions Header (No Print) */}
              <div className="no-print bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Automated Payment Receipt</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/50"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Invoice (প্রিন্ট করুন)
                  </button>
                  <button
                    onClick={() => setActiveInvoice(null)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Container */}
              <div 
                id="printable-invoice-container"
                className="bg-white text-slate-900 p-6 sm:p-8 space-y-6 select-text"
              >
                {/* Helper to render identical copy of receipt */}
                {(() => {
                  const renderSingleReceipt = (type: 'guardian' | 'office') => {
                    return (
                      <div className="space-y-3">
                        {/* Header Section */}
                        <div className="relative pb-3 border-b border-slate-200 flex flex-col items-center justify-center text-center">
                          <div className="space-y-0.5">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 font-serif">
                              MSCare Center
                            </h1>
                            <p className="text-[11px] sm:text-[12px] italic font-serif text-slate-800 leading-normal">
                              Care with Logic, Intelligence for Excellence
                            </p>
                            <p className="text-[11px] sm:text-[12px] font-serif text-slate-800 leading-normal">
                              Agrabad, Chittagong
                            </p>
                          </div>
                        </div>

                        {/* Copy Label & Meta Info Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div>
                            {type === 'office' ? (
                              <span className="inline-block bg-[#334155] text-white text-[9px] sm:text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-wider font-sans border border-slate-600 shadow-sm">
                                OFFICE COPY / অফিস কপি
                              </span>
                            ) : (
                              <div className="h-5 sm:h-7" />
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-right text-[10px] min-w-[180px]">
                            <div>
                              <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] block">Receipt Number</span>
                              <span className="font-mono font-bold text-slate-900 text-[11px]">{activeInvoice.invoiceNumber}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] block">Issued Date & Time</span>
                              <span className="font-medium text-slate-800">{activeInvoice.dateTime}</span>
                            </div>
                          </div>
                        </div>

                        {/* Student info box */}
                        <div className="bg-[#eff6ff] border border-blue-200 rounded-xl p-3 shadow-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 text-[9px] font-medium block">Student Name (শিক্ষার্থীর নাম)</span>
                              <span className="font-bold text-slate-800 text-xs sm:text-sm">{activeInvoice.student.name}</span>
                              {activeInvoice.student.nameBangla && (
                                <span className="text-[10px] text-slate-500 block font-medium mt-0.5">{activeInvoice.student.nameBangla}</span>
                              )}
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9px] font-medium block">Class Level (শ্রেণি)</span>
                              <span className="font-bold text-slate-800 text-xs sm:text-sm">{activeInvoice.student.classLevel}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9px] font-medium block">Batch Time (ব্যাচ)</span>
                              <span className="font-bold text-slate-800 text-xs sm:text-sm">{activeInvoice.student.batchTime || 'General'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Billing Table */}
                        <div className="space-y-1.5">
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-[#1e3a8a] text-white border-b border-blue-300 text-[9px] font-bold uppercase tracking-wider">
                                  <th className="px-4 py-2">Description (বিবরণ)</th>
                                  <th className="px-4 py-2 text-right">Standard Fee (৳)</th>
                                  <th className="px-4 py-2 text-right">Received Amount (৳)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150 text-[11px]">
                                <tr>
                                  <td className="px-4 py-2 font-medium text-slate-800">
                                    Monthly Tuition Fee for {getMonthNameBangla(activeInvoice.month)}
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono font-medium text-slate-600">
                                    ৳{(activeInvoice.amount).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">
                                    ৳{(activeInvoice.paidAmount).toLocaleString()}
                                  </td>
                                </tr>
                                {/* Summary Total Row */}
                                <tr className="bg-slate-50 font-bold border-t border-slate-200">
                                  <td colSpan={2} className="px-4 py-1 text-right text-slate-600 uppercase tracking-wider text-[8px]">
                                    Total Paid (সর্বমোট প্রাপ্তি)
                                  </td>
                                  <td className="px-4 py-1 text-right font-mono text-slate-950 text-xs">
                                    ৳{(activeInvoice.paidAmount).toLocaleString()}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Signatures & Stamp Section */}
                        <div className="grid grid-cols-3 gap-2 pt-4 text-xs items-end">
                          <div className="space-y-0.5 flex flex-col justify-end">
                            <span className="text-slate-400 text-[8px] font-bold uppercase tracking-wider block">Care By</span>
                            <p className="font-bold text-slate-800 leading-tight">Nion Hassan Nirjon</p>
                            <p className="text-[9px] text-slate-500 font-medium leading-none">Founder & Instructor, MSC</p>
                          </div>
                          <div className="flex justify-center items-center h-full pb-0.5">
                            <div 
                              className="border-[3px] border-emerald-600 text-emerald-600 bg-white font-black rounded-xl px-4 py-1.5 uppercase tracking-widest text-[9px] inline-block select-none shadow-xs font-sans"
                              style={{ transform: 'rotate(-5deg)' }}
                            >
                              PAID / পরিশোধিত
                            </div>
                          </div>
                          <div className="text-right space-y-2 flex flex-col justify-end items-end">
                            <div className="w-24 border-b border-slate-300"></div>
                            <span className="text-slate-400 text-[8px] font-bold uppercase tracking-wider block pr-1">
                              Authorized Signature
                            </span>
                          </div>
                        </div>

                        {/* Minimal printed stamp / info footer */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-400 font-medium">
                          <span>This is a secure system-generated receipt. Physical signature is required.</span>
                          <span>System ID: MSC-{activeInvoice.month.replace('-', '')}</span>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-4">
                      {/* Top Receipt (Guardian Copy) */}
                      {renderSingleReceipt('guardian')}

                      {/* Styled minimalist dashed/dotted separator line */}
                      <div className="border-t border-dashed border-slate-300 my-3"></div>

                      {/* Bottom Receipt (Office Copy) */}
                      {renderSingleReceipt('office')}
                    </div>
                  );
                })()}
              </div>

              {/* Back to list button at footer (No Print) */}
              <div className="no-print bg-slate-900 px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveInvoice(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Done (সমাপ্ত)
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/50"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Receipt
                </button>
              </div>

            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
