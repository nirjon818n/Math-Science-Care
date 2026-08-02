/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StudentStatus } from '../types';
import {
  Send,
  MessageSquare,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Filter,
  ShieldAlert,
  Clock,
  Layers,
  FileText,
  UserCheck,
  RotateCw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RecipientItem {
  phone: string;
  studentName: string;
  role: string; // 'Father' | 'Mother' | 'Parent'
  studentClass: string;
}

export default function BulkSmsView() {
  const { students, settings, addSmsLog, adminPassword, showToast, logAction } = useApp();

  // Form State
  const [messageText, setMessageText] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [includeFathers, setIncludeFathers] = useState(true);
  const [includeMothers, setIncludeMothers] = useState(true);

  // Modal & Password confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPwText, setShowPwText] = useState(false);

  // Sending progress state
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [currentSendingPhone, setCurrentSendingPhone] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);

  // Helper functions for Bangladeshi Phone Numbers
  const cleanPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.startsWith('880')) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('88')) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.length === 10 && cleaned.startsWith('1')) {
      cleaned = '0' + cleaned;
    }
    return cleaned;
  };

  const isValidBangladeshiMobile = (phone: string): boolean => {
    const cleaned = cleanPhoneNumber(phone);
    return /^01[3-9]\d{8}$/.test(cleaned);
  };

  // Get list of unique available classes
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    students.forEach((s) => {
      if (s.classLevel) classSet.add(s.classLevel);
    });
    return Array.from(classSet).sort();
  }, [students]);

  // Calculate unique target recipients
  const targetRecipients = useMemo(() => {
    const map = new Map<string, RecipientItem>();

    const activeStudents = students.filter(
      (s) => s.status === StudentStatus.Active || s.status === 'Active' || !s.status
    );

    const filteredStudents = activeStudents.filter((s) => {
      if (selectedClass !== 'All' && s.classLevel !== selectedClass) {
        return false;
      }
      return true;
    });

    filteredStudents.forEach((student) => {
      const studentName = student.nameBangla || student.name;
      const studentClass = student.classLevel || 'N/A';

      // Father's phone
      if (includeFathers) {
        const fatherPhone = student.fathersPhone || student.parentPhone || '';
        if (isValidBangladeshiMobile(fatherPhone)) {
          const cleaned = cleanPhoneNumber(fatherPhone);
          if (!map.has(cleaned)) {
            map.set(cleaned, {
              phone: cleaned,
              studentName,
              role: 'Father',
              studentClass,
            });
          }
        }
      }

      // Mother's phone
      if (includeMothers) {
        const motherPhone = student.mothersPhone || '';
        if (isValidBangladeshiMobile(motherPhone)) {
          const cleaned = cleanPhoneNumber(motherPhone);
          if (!map.has(cleaned)) {
            map.set(cleaned, {
              phone: cleaned,
              studentName,
              role: 'Mother',
              studentClass,
            });
          }
        }
      }
    });

    return Array.from(map.values());
  }, [students, selectedClass, includeFathers, includeMothers]);

  // Calculate Unicode / Bangla SMS Segments
  const smsMetrics = useMemo(() => {
    const text = messageText.trim();
    if (!text) return { length: 0, isUnicode: true, segments: 0, totalCredits: 0 };

    // Check if contains non-GSM 7-bit characters (Bangla, etc.)
    const isUnicode = /[^\x00-\x7F]/.test(text);

    let segments = 1;
    if (isUnicode) {
      if (text.length <= 70) {
        segments = 1;
      } else {
        segments = Math.ceil(text.length / 67);
      }
    } else {
      if (text.length <= 160) {
        segments = 1;
      } else {
        segments = Math.ceil(text.length / 153);
      }
    }

    const totalCredits = targetRecipients.length * segments;

    return {
      length: text.length,
      isUnicode,
      segments,
      totalCredits,
    };
  }, [messageText, targetRecipients.length]);

  // Pre-defined Notice Templates
  const noticeTemplates = [
    {
      title: 'বিশেষ ক্লাস নোটিশ',
      text: 'আসসালামু আলাইকুম। প্রিয় অভিভাবক, শিক্ষার্থীদের পড়াশোনার ধারাবাহিকতা রক্ষায় আগামীকাল বিশেষ ক্লাস অনুষ্ঠিত হবে। সময়মত উপস্থিত থাকার অনুরোধ রইল।\nধন্যবাদান্তে,\nMSCare Center',
    },
    {
      title: 'পরীক্ষার নোটিশ',
      text: 'আসসালামু আলাইকুম। প্রিয় অভিভাবক, আগামী সপ্তাহে শিক্ষার্থীদের মডেল টেস্ট পরীক্ষা অনুষ্ঠিত হবে। প্রস্তুতি ও নিয়মিত উপস্থিতি নিশ্চিত করার অনুরোধ করা হচ্ছে।\nধন্যবাদান্তে,\nMSCare Center',
    },
    {
      title: 'অভিভাবক সভা',
      text: 'আসসালামু আলাইকুম। প্রিয় অভিভাবক, শিক্ষার্থীদের সামগ্রিক অগ্রগতি পর্যালোচনার জন্য আগামী শুক্রবার বিকেল ৪:০০ টায় অভিভাবক সভা অনুষ্ঠিত হবে। আপনার উপস্থিতি একান্ত কাম্য।\nধন্যবাদান্তে,\nMSCare Center',
    },
    {
      title: 'টিউশন ফি বকেয়া',
      text: 'আসসালামু আলাইকুম। প্রিয় অভিভাবক, চলতি মাসের টিউশন ফি সময়মতো পরিশোধ করার জন্য বিনীত অনুরোধ করা হচ্ছে। আপনার আন্তরিক সহযোগিতার জন্য ধন্যবাদ।\nধন্যবাদান্তে,\nMSCare Center',
    },
    {
      title: 'ক্লাস ছুটির নোটিশ',
      text: 'আসসালামু আলাইকুম। প্রিয় অভিভাবক, সরকারি ছুটি উপলক্ষে আগামী ১ দিন কোচিং এর সকল ক্লাস স্থগিত থাকবে। পরবর্তী দিন হতে যথারীতি ক্লাস চলবে।\nধন্যবাদান্তে,\nMSCare Center',
    },
  ];

  // Step 1: Open Confirmation Modal
  const handleInitiateSend = () => {
    if (!settings.smsServiceEnabled && settings.smsServiceEnabled !== undefined) {
      showToast('এসএমএস সার্ভিস বন্ধ আছে! সেটিংস থেকে চালু করুন।', 'warning');
      return;
    }
    if (!messageText.trim()) {
      showToast('অনুগ্রহ করে নোটিশের বার্তা টাইপ করুন।', 'error');
      return;
    }
    if (targetRecipients.length === 0) {
      showToast('কোনো বৈধ মোবাইল নম্বর পাওয়া যায়নি।', 'error');
      return;
    }

    setAdminPwInput('');
    setPwError(null);
    setShowConfirmModal(true);
  };

  // Step 2: Confirm password & Execute Bulk SMS
  const handleConfirmPasswordAndSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);

    if (!adminPwInput.trim()) {
      setPwError('অনুগ্রহ করে অ্যাডমিন পাসওয়ার্ড প্রদান করুন।');
      return;
    }

    setIsVerifying(true);

    try {
      const authRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPwInput }),
      });

      if (!authRes.ok) {
        const errJson = await authRes.json().catch(() => ({}));
        setPwError(errJson.error || 'ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিয়ে চেষ্টা করুন।');
        setIsVerifying(false);
        return;
      }

      // Auth successful! Close modal and launch sending process
      setShowConfirmModal(false);
      setIsVerifying(false);
      startBulkSending(adminPwInput);
    } catch (err: any) {
      setPwError('সার্ভার যাচাইকরণ ব্যর্থ হয়েছে: ' + (err.message || 'Error'));
      setIsVerifying(false);
    }
  };

  // Step 3: Sequential / Batch sending loop
  const startBulkSending = async (pw: string) => {
    setIsSending(true);
    setIsCompleted(false);
    setSentCount(0);
    setSuccessCount(0);
    setFailedCount(0);

    const recipients = [...targetRecipients];
    const total = recipients.length;
    let currentSuccess = 0;
    let currentFailed = 0;

    const BATCH_SIZE = 3;
    const DELAY_MS = 250;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (recipient) => {
          setCurrentSendingPhone(recipient.phone);
          let isSuccess = false;
          let responseRaw = '';

          try {
            const smsRes = await fetch(`/api/send-sms?auth=${encodeURIComponent(pw)}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Password': pw,
              },
              body: JSON.stringify({
                mobile: recipient.phone,
                message: messageText.trim(),
              }),
            });

            const data = await smsRes.json().catch(() => ({}));
            responseRaw = typeof data === 'object' ? JSON.stringify(data) : String(data);

            if (smsRes.ok && data.success) {
              isSuccess = true;
            } else {
              isSuccess = false;
            }
          } catch (err: any) {
            isSuccess = false;
            responseRaw = err.message || 'Network request failed';
          }

          // Log in sms_logs
          addSmsLog({
            student_name: recipient.studentName,
            recipient_role: recipient.role,
            phone_number: recipient.phone,
            message_type: 'Notice',
            message_content: messageText.trim(),
            status: isSuccess ? 'Success' : 'Failed',
            response_raw: responseRaw,
          });

          if (isSuccess) {
            currentSuccess++;
          } else {
            currentFailed++;
          }
        })
      );

      const processedSoFar = Math.min(i + BATCH_SIZE, total);
      setSentCount(processedSoFar);
      setSuccessCount(currentSuccess);
      setFailedCount(currentFailed);

      // Short break between batches to keep execution smooth
      if (i + BATCH_SIZE < total) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    setIsSending(false);
    setIsCompleted(true);

    // Summary Toast as requested
    showToast(
      `বাল্ক এসএমএস সম্পূর্ণ: ${currentSuccess}টি সফল, ${currentFailed}টি ব্যর্থ`,
      currentFailed === 0 ? 'success' : 'warning'
    );

    if (logAction) {
      logAction(
        'Bulk SMS',
        'Notice Sent',
        `${currentSuccess}টি সফল ও ${currentFailed}টি ব্যর্থ এসএমএস পাঠানো হয়েছে (${total} জন প্রপকের মধ্যে)`,
        currentFailed === 0 ? 'success' : 'warning'
      );
    }
  };

  const isSmsServiceDisabled = settings.smsServiceEnabled === false;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Send className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              বাল্ক এসএমএস / গণ নোটিশ (Bulk SMS)
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            একসাথে সকল বা নির্দিষ্ট শ্রেণীর শিক্ষার্থীদের অভিভাবকদের কাছে কাস্টম নোটিশ ও এসএমএস বার্তা পাঠাক।
          </p>
        </div>

        {/* SMS Service Active Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              isSmsServiceDisabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSmsServiceDisabled ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            ></span>
            {isSmsServiceDisabled ? 'এসএমএস সার্ভিস: বন্ধ (Disabled)' : 'এসএমএস সার্ভিস: সক্রিয় (Active)'}
          </div>
        </div>
      </div>

      {/* Service Disabled Alert Banner */}
      {isSmsServiceDisabled && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold block">⚠️ এসএমএস সার্ভিস বর্তমানে বন্ধ রয়েছে</span>
            <p className="text-amber-300/80 text-xs mt-0.5">
              নোটিশ পাঠানোর সুবিধা পেতে সেটিংস অথবা এসএমএস ড্যাশবোর্ড থেকে এসএমএস সার্ভিসটি সক্রিয় করুন।
            </p>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Message Editor & Templates (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Quick Notice Templates */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                দ্রুত নোটিশ টেমপ্লেট (Quick Templates)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {noticeTemplates.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setMessageText(tmpl.text)}
                  disabled={isSending}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 text-xs font-medium transition-colors hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer disabled:opacity-50"
                >
                  {tmpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Text Message Area */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                নোটিশের বার্তা লিখুন (SMS Content)
              </label>

              {messageText && (
                <button
                  onClick={() => setMessageText('')}
                  disabled={isSending}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
                >
                  ক্লিয়ার করুন
                </button>
              )}
            </div>

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              disabled={isSending}
              rows={7}
              placeholder="এখানে আপনার নোটিশ টাইপ করুন (বাংলা ইউনিকোড সমর্থিত)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all font-sans leading-relaxed disabled:opacity-60"
            ></textarea>

            {/* Character & Segment Metrics Footer */}
            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-slate-400">
                <span>
                  অক্ষর: <strong className="text-slate-100">{smsMetrics.length}</strong>
                </span>
                <span>
                  এনকোডিং:{' '}
                  <strong className="text-indigo-400">
                    {smsMetrics.isUnicode ? 'Unicode (বাংলা)' : 'GSM (English)'}
                  </strong>
                </span>
                <span>
                  মেসেজ অংশ:{' '}
                  <strong className="text-emerald-400">
                    {smsMetrics.segments} টি {smsMetrics.segments > 1 ? '(Multi-part)' : ''}
                  </strong>
                </span>
              </div>

              <div className="text-slate-400">
                মোট আনুমানিক এসএমএস:{' '}
                <strong className="text-amber-400 text-sm font-mono">
                  {smsMetrics.totalCredits}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recipient Target Filters & Summary (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Target Filter Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              প্রাপক নির্বাচন (Target Audience)
            </h2>

            {/* Class Level Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">শ্রেণী / ক্লাস (Class Level):</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={isSending}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500/60 cursor-pointer disabled:opacity-60"
              >
                <option value="All">সকল শ্রেণী (All Active Students)</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Parent Role Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400 block">প্রাপকের তালিকা অন্তর্ভুক্ত করুন:</span>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeFathers}
                    onChange={(e) => setIncludeFathers(e.target.checked)}
                    disabled={isSending}
                    className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 bg-slate-950"
                  />
                  <span>বাবার নম্বর (Father's Phone Number)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeMothers}
                    onChange={(e) => setIncludeMothers(e.target.checked)}
                    disabled={isSending}
                    className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 bg-slate-950"
                  />
                  <span>মায়ের নম্বর (Mother's Phone Number)</span>
                </label>
              </div>
            </div>

            {/* Recipient Count Summary Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">মোট ইউনিক মোবাইল নম্বর:</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {targetRecipients.length} জন
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-850">
                <span>ফিল্টারকৃত শিক্ষার্থী:</span>
                <span>
                  {selectedClass === 'All'
                    ? `${students.filter((s) => s.status === StudentStatus.Active || s.status === 'Active' || !s.status).length} জন`
                    : `${students.filter((s) => (s.status === StudentStatus.Active || s.status === 'Active' || !s.status) && s.classLevel === selectedClass).length} জন`}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleInitiateSend}
              disabled={
                isSending ||
                isSmsServiceDisabled ||
                !messageText.trim() ||
                targetRecipients.length === 0
              }
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Send className="w-4 h-4" />
              <span>
                {targetRecipients.length > 0
                  ? `নোটিশ পাঠান (${targetRecipients.length} জন অভিভাবক)`
                  : 'প্রাপক নির্বাচন করুন'}
              </span>
            </button>
          </div>

          {/* Sending Progress Display Box (when actively sending or completed) */}
          {(isSending || isCompleted) && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  {isSending ? 'পাঠানো হচ্ছে...' : 'নোটিশ পাঠানো সম্পন্ন'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {sentCount} / {targetRecipients.length}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      targetRecipients.length > 0
                        ? Math.round((sentCount / targetRecipients.length) * 100)
                        : 0
                    }%`,
                  }}
                ></div>
              </div>

              {/* Live Count Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-medium">সফল (Success):</span>
                  <span className="text-sm font-bold text-emerald-300 font-mono">
                    {successCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                  <span className="text-xs text-rose-400 font-medium">ব্যর্থ (Failed):</span>
                  <span className="text-sm font-bold text-rose-300 font-mono">
                    {failedCount}
                  </span>
                </div>
              </div>

              {isSending && currentSendingPhone && (
                <p className="text-[11px] text-slate-500 text-center font-mono animate-pulse">
                  পাঠানো হচ্ছে: {currentSendingPhone}
                </p>
              )}

              {isCompleted && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    সম্পূর্ণ সম্পন্ন হয়েছে!
                  </span>
                  <p className="text-xs text-slate-400">
                    {successCount} টি সফল এবং {failedCount} টি ব্যর্থ এসএমএস লগ সিস্টেমে রেকর্ড করা হয়েছে।
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADMIN PASSWORD RE-VERIFICATION CONFIRMATION MODAL */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">
                    বাল্ক এসএমএস নিশ্চিতকরণ
                  </h3>
                  <span className="text-xs text-slate-400">
                    অ্যাডমিন পাসওয়ার্ড নিশ্চিত করে মেসেজ পাঠান
                  </span>
                </div>
              </div>

              {/* Target info notice */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
                <p className="leading-relaxed">
                  আপনি কি নিশ্চিত যে <strong className="text-emerald-400">{targetRecipients.length}</strong> জন ইউনিক অভিভাবকের ফোন নম্বরে এই নোটিশ পাঠাতে চান?
                </p>
                <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-850 font-mono">
                  <span>মোট ক্রেডিট খরচ:</span>
                  <span className="text-amber-400 font-bold">{smsMetrics.totalCredits} টি SMS</span>
                </div>
              </div>

              {/* Content Preview */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  বার্তা প্রিভিউ:
                </span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 text-slate-300 text-xs max-h-28 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {messageText.trim()}
                </div>
              </div>

              {/* Password Form */}
              <form onSubmit={handleConfirmPasswordAndSend} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>অ্যাডমিন পাসওয়ার্ড:</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPwText ? 'text' : 'password'}
                      value={adminPwInput}
                      onChange={(e) => setAdminPwInput(e.target.value)}
                      placeholder="অ্যাডমিন পাসওয়ার্ড দিন..."
                      autoFocus
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500/60 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwText(!showPwText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPwText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {pwError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{pwError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    disabled={isVerifying}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    বাতিল (Cancel)
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifying || !adminPwInput.trim()}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isVerifying ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>যাচাই করা হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>যাচাই করে পাঠান</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
