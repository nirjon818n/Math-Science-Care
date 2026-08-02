import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SmsLog } from '../types';
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCw,
  Coins,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  ShieldAlert,
  Calendar,
  User,
  Phone,
  ArrowUpDown,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export default function SmsDashboard() {
  const { smsLogs, addSmsLog, adminPassword, settings, updateSettings, showToast, logAction } = useApp();
  
  // Resend state
  const [resendingLogIds, setResendingLogIds] = useState<string[]>([]);
  const [batchResending, setBatchResending] = useState(false);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Failed'>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Live Balance Widget State
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Inspector Modal State
  const [activeLogModal, setActiveLogModal] = useState<SmsLog | null>(null);

  // Password prompt for toggle
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwModalPassword, setPwModalPassword] = useState('');
  const [pwModalError, setPwModalError] = useState<string | null>(null);
  const [pwModalLoading, setPwModalLoading] = useState(false);
  const [pwModalShowPassword, setPwModalShowPassword] = useState(false);

  const handleToggleSmsService = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPwModalError(null);
    setPwModalLoading(true);

    if (!pwModalPassword.trim()) {
      setPwModalError('অনুগ্রহ করে অ্যাডমিন পাসওয়ার্ড প্রদান করুন।');
      setPwModalLoading(false);
      return;
    }

    try {
      // Challenge the password using the existing secure /api/auth endpoint
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwModalPassword }),
      });

      if (res.ok) {
        const currentStatus = settings.smsServiceEnabled !== false;
        const newStatus = !currentStatus;
        
        updateSettings({ smsServiceEnabled: newStatus });
        
        if (logAction) {
          logAction(
            'SMS Dashboard', 
            newStatus ? 'SMS Service Activated' : 'SMS Service Deactivated', 
            `SMS service was manually ${newStatus ? 'turned ON' : 'turned OFF'} after successful admin verification.`, 
            newStatus ? 'success' : 'warning'
          );
        }

        showToast(
          newStatus 
            ? 'SMS সার্ভিস সফলভাবে চালু করা হয়েছে!' 
            : 'SMS সার্ভিস সফলভাবে বন্ধ করা হয়েছে!',
          'success'
        );

        setShowPasswordModal(false);
        setPwModalPassword('');
        setPwModalError(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setPwModalError(errData.error || 'ভুল অ্যাডমিন পাসওয়ার্ড। অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।');
      }
    } catch (err) {
      setPwModalError('পাসওয়ার্ড যাচাইকরণ ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setPwModalLoading(false);
    }
  };

  // Fetch Live Balance
  const fetchBalance = async (isManualRefresh = false) => {
    try {
      if (!isManualRefresh) {
        setBalanceLoading(true);
      }
      setBalanceError(null);

      const activeAuth = adminPassword || sessionStorage.getItem('msc_admin_auth') || '';
      const response = await fetch(`/api/sms-balance?auth=${activeAuth}&_=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const data = await response.json();
      
      setIsOfflineMode(!!data.offline);
      
      let val = "";
      if (data && data.balance !== undefined) {
        val = String(data.balance);
      } else if (data && data.response !== undefined) {
        val = String(data.response);
      } else if (data && data.balance_amount !== undefined) {
        val = String(data.balance_amount);
      } else if (data && typeof data === 'object') {
        const keys = Object.keys(data);
        const foundKey = keys.find(k => k.toLowerCase().includes('balance') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('credit'));
        if (foundKey && data[foundKey] !== undefined) {
          val = String(data[foundKey]);
        }
      }

      // Clean up string if it contains "৳" or extra characters
      val = val.replace(/৳/g, '').replace(/Offline/gi, '').trim();

      if (val && !isNaN(parseFloat(val))) {
        setBalance(val);
      } else if (data && data.balance) {
        setBalance(String(data.balance));
      } else {
        setBalance("0.00");
      }
    } catch (err: any) {
      console.error('Failed to load SMS balance:', err);
      setBalanceError(err.message || 'ব্যালেন্স লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setBalanceLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalance(false);

    // Fail-safe background polling every 3 seconds to keep the SMS balance and status synchronized
    const intervalId = setInterval(() => {
      fetchBalance(true);
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [adminPassword]);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    fetchBalance(true);
  };

  // Manual Resend Handler for Single Failed SMS
  const handleResendSingle = async (log: SmsLog) => {
    if (settings.smsServiceEnabled === false) {
      showToast('⚠️ SMS সার্ভিস বর্তমানে বন্ধ রয়েছে। মেসেজ পাঠাতে প্রথমে সার্ভিস চালু করুন।', 'error');
      return;
    }
    if (resendingLogIds.includes(log.id) || batchResending) return;
    setResendingLogIds(prev => [...prev, log.id]);

    try {
      const activeAuth = adminPassword || sessionStorage.getItem('msc_admin_auth') || '';
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': activeAuth,
        },
        body: JSON.stringify({
          number: log.phone_number,
          message: log.message_content,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        addSmsLog({
          student_name: log.student_name,
          recipient_role: log.recipient_role,
          phone_number: log.phone_number,
          message_type: log.message_type,
          message_content: log.message_content,
          status: 'Success',
          response_raw: JSON.stringify(data.data || data),
        });

        showToast(`'${log.student_name}' এর জন্য SMS সফলভাবে পুনরায় পাঠানো হয়েছে!`, 'success');
        if (logAction) {
          logAction(
            'SMS Dashboard',
            'SMS Resent',
            `Resent SMS to ${log.student_name} (${log.phone_number}) successfully.`,
            'success'
          );
        }
        fetchBalance(true);
        if (activeLogModal?.id === log.id) {
          setActiveLogModal(null);
        }
      } else {
        const errorMsg = data.error || 'Automas API সাড়া দেয়নি';
        addSmsLog({
          student_name: log.student_name,
          recipient_role: log.recipient_role,
          phone_number: log.phone_number,
          message_type: log.message_type,
          message_content: log.message_content,
          status: 'Failed',
          response_raw: JSON.stringify(data),
        });

        showToast(`SMS পাঠাতে ব্যর্থ হয়েছে: ${errorMsg}`, 'error');
        if (logAction) {
          logAction(
            'SMS Dashboard',
            'SMS Resend Failed',
            `Failed to resend SMS to ${log.student_name} (${log.phone_number}): ${errorMsg}`,
            'warning'
          );
        }
      }
    } catch (err: any) {
      showToast(`নেটওয়ার্ক বা সার্ভার সমস্যা: ${err.message || 'SMS পাঠাতে ব্যর্থ হয়েছে'}`, 'error');
    } finally {
      setResendingLogIds(prev => prev.filter(id => id !== log.id));
    }
  };

  // Batch Resend Handler for All Failed SMS
  const handleResendAllFailed = async () => {
    if (settings.smsServiceEnabled === false) {
      showToast('⚠️ SMS সার্ভিস বর্তমানে বন্ধ রয়েছে। মেসেজ পাঠাতে প্রথমে সার্ভিস চালু করুন।', 'error');
      return;
    }
    const failedLogs = filteredLogs.filter(l => l.status === 'Failed');
    if (failedLogs.length === 0) return;

    if (!confirm(`আপনি কি নিশ্চিত যে ফিল্টারকৃত সকল ব্যর্থ (${failedLogs.length} টি) SMS পুনরায় পাঠাতে চান?`)) {
      return;
    }

    setBatchResending(true);
    let successCount = 0;
    let failCount = 0;

    for (const log of failedLogs) {
      try {
        const activeAuth = adminPassword || sessionStorage.getItem('msc_admin_auth') || '';
        const res = await fetch('/api/send-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': activeAuth,
          },
          body: JSON.stringify({
            number: log.phone_number,
            message: log.message_content,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          successCount++;
          addSmsLog({
            student_name: log.student_name,
            recipient_role: log.recipient_role,
            phone_number: log.phone_number,
            message_type: log.message_type,
            message_content: log.message_content,
            status: 'Success',
            response_raw: JSON.stringify(data.data || data),
          });
        } else {
          failCount++;
          addSmsLog({
            student_name: log.student_name,
            recipient_role: log.recipient_role,
            phone_number: log.phone_number,
            message_type: log.message_type,
            message_content: log.message_content,
            status: 'Failed',
            response_raw: JSON.stringify(data),
          });
        }
      } catch (e) {
        failCount++;
      }
    }

    setBatchResending(false);
    fetchBalance(true);

    if (successCount > 0) {
      showToast(`${successCount} টি ব্যর্থ SMS পুনরায় সফলভাবে পাঠানো হয়েছে!${failCount > 0 ? ` (${failCount} টি পুনরায় ব্যর্থ)` : ''}`, 'success');
    } else {
      showToast('SMS পুনরায় পাঠাতে ব্যর্থ হয়েছে।', 'error');
    }
  };

  // Extract unique message types for filter dropdown
  const messageTypes = ['All', 'Admission', 'Attendance (Present)', 'Attendance (Absent)', 'Monthly Report'];

  // Apply filters
  const filteredLogs = smsLogs.filter((log) => {
    const matchesSearch = 
      log.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.phone_number.includes(searchQuery);
    
    const matchesStatus = 
      statusFilter === 'All' ? true : log.status === statusFilter;
    
    const matchesType = 
      typeFilter === 'All' ? true : log.message_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Analytics helper variables
  const totalSent = smsLogs.length;
  const successSent = smsLogs.filter(l => l.status === 'Success').length;
  const failedSent = smsLogs.filter(l => l.status === 'Failed').length;
  const successRate = totalSent > 0 ? Math.round((successSent / totalSent) * 100) : 100;

  // Render SMS Type Badge color helper
  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'Admission':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Attendance (Present)':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Attendance (Absent)':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Monthly Report':
        return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  // Formatting timestamp cleanly
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const strHours = String(hours).padStart(2, '0');
      return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-slate-200">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 md:p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            SMS লগ এবং ডেলিভারি ড্যাশবোর্ড
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            স্বয়ংক্রিয় এবং ম্যানুয়াল পাঠানো মেসেজের ইতিহাস ও লাইভ ব্যালেন্স ট্র্যাকার।
          </p>
        </div>

        {/* Compact Toggle Switch resembling the user's reference image */}
        <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-2xl px-3.5 py-2 shadow-inner self-start md:self-auto">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">SMS SERVICE</p>
            <p className={`text-[11px] font-extrabold mt-1 flex items-center gap-1 ${settings.smsServiceEnabled !== false ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${settings.smsServiceEnabled !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              {settings.smsServiceEnabled !== false ? 'ACTIVE (চালু)' : 'DISABLED (বন্ধ)'}
            </p>
          </div>
          
          <button
            onClick={() => {
              setShowPasswordModal(true);
              setPwModalPassword('');
              setPwModalError(null);
            }}
            title={settings.smsServiceEnabled !== false ? "SMS সার্ভিস বন্ধ করুন" : "SMS সার্ভিস চালু করুন"}
            className="relative flex items-center justify-between w-[96px] h-[44px] p-1 rounded-full cursor-pointer transition-all duration-300 select-none shadow-[0_4px_12px_rgba(0,0,0,0.4)] active:scale-95 focus:outline-none shrink-0"
            style={{
              backgroundColor: settings.smsServiceEnabled !== false ? '#4cd137' : '#ff2c2c',
              border: '2.5px solid #ffffff',
            }}
          >
            {settings.smsServiceEnabled !== false ? (
              <>
                <span className="pl-3.5 text-white text-xs font-black tracking-widest leading-none select-none">
                  ON
                </span>
                <div 
                  className="w-[32px] h-[32px] bg-gradient-to-b from-white to-slate-200 rounded-full flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_0_-1px_2px_rgba(0,0,0,0.1)] transition-all duration-300 transform"
                  style={{
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {/* Little dimple in center matching reference image */}
                  <div className="w-2.5 h-2.5 bg-slate-100 rounded-full border border-slate-300/85 shadow-[inset_0_1px_1.5px_rgba(0,0,0,0.15)] flex items-center justify-center">
                    <div className="w-0.5 h-0.5 bg-slate-400 rounded-full" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div 
                  className="w-[32px] h-[32px] bg-gradient-to-b from-white to-slate-200 rounded-full flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_0_-1px_2px_rgba(0,0,0,0.1)] transition-all duration-300 transform"
                  style={{
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {/* Little dimple in center matching reference image */}
                  <div className="w-2.5 h-2.5 bg-slate-100 rounded-full border border-slate-300/85 shadow-[inset_0_1px_1.5px_rgba(0,0,0,0.15)] flex items-center justify-center">
                    <div className="w-0.5 h-0.5 bg-slate-400 rounded-full" />
                  </div>
                </div>
                <span className="pr-3 text-white text-xs font-black tracking-widest leading-none select-none">
                  OFF
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warning notice when SMS service is disabled */}
      {settings.smsServiceEnabled === false && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-300 text-xs font-bold shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30">
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-rose-200">⚠️ SMS সার্ভিস বর্তমানে বন্ধ রয়েছে (DISABLED)</p>
              <p className="text-slate-400 font-normal mt-0.5">
                কোনো স্বয়ংক্রিয় বা ম্যানুয়াল SMS পাঠানো যাবে না। SMS পাঠাতে সার্ভিসটি চালু করুন।
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowPasswordModal(true);
              setPwModalPassword('');
              setPwModalError(null);
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-sm self-end sm:self-auto"
          >
            সার্ভিস চালু করুন
          </button>
        </div>
      )}

      {/* Top Cards: Metrics and Live Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Live Balance Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl lg:col-span-2 flex flex-col justify-between group">
          <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-500">
            <Coins className="w-32 h-32 text-emerald-400" />
          </div>
          
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xs font-bold text-slate-400 tracking-wide uppercase">Automas SMS ব্যালেন্স</span>
            </div>
            
            <button
              onClick={handleRefreshClick}
              disabled={balanceLoading || isRefreshing}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition cursor-pointer disabled:opacity-50"
              title="ব্যালেন্স রিফ্রেশ করুন"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          <div className="my-2">
            {balanceLoading ? (
              <div className="space-y-2">
                <div className="h-8 bg-slate-800 rounded-lg animate-pulse w-3/4"></div>
                <div className="h-3 bg-slate-800 rounded animate-pulse w-1/2"></div>
              </div>
            ) : balanceError ? (
              <div className="flex items-center gap-2 text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-[11px]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>ব্যালেন্স লোড করা যায়নি। পুনরায় চেষ্টা করুন।</span>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-extrabold tracking-tight text-emerald-400 select-all font-mono flex items-center gap-2">
                  {isNaN(parseFloat(balance || '0')) ? (balance || '0') : `৳ ${parseFloat(balance || '0').toFixed(2)}`}
                  {isOfflineMode && (
                    <span className="text-[10px] font-sans font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                      Cached
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  {isOfflineMode ? "ব্যালেন্স স্টেট (Cloud Restricted Fallback)" : "বর্তমান ব্যালেন্স (লাইভ এপিআই রেসপন্স)"}
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-850 text-[10px] text-slate-400 flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isOfflineMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></div>
              <span>{isOfflineMode ? "ক্লাউড আইপি সীমাবদ্ধতা: প্রক্সি ক্যাশ মোড সক্রিয়" : "এপিআই কী সুরক্ষিতভাবে ব্যাকএন্ড প্রক্সি দ্বারা সংযুক্ত"}</span>
            </div>
            {isOfflineMode && (
              <span className="text-[9px] text-amber-500 bg-amber-500/5 border border-amber-500/10 px-1 rounded font-mono" title="Automas SMS Gateway restricts direct requests from Google Cloud Run IPs. The application fallbacks to last known secure balance.">GCP-IP</span>
            )}
          </div>
        </div>

        {/* Total SMS Dispatched */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">সর্বমোট প্রেরিত</span>
            <p className="text-3xl font-extrabold text-slate-100 font-mono mt-2">{totalSent}</p>
          </div>
          <div className="text-[10px] text-slate-500 mt-4 flex items-center justify-between">
            <span>সফল: <strong className="text-emerald-400 font-mono">{successSent}</strong></span>
            <span>ব্যর্থ: <strong className="text-rose-400 font-mono">{failedSent}</strong></span>
          </div>
        </div>

        {/* Delivery Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">ডেলিভারি রেট</span>
            <p className="text-3xl font-extrabold text-indigo-400 font-mono mt-2">{successRate}%</p>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${successRate}%` }}
              ></div>
            </div>
          </div>
        </div>

      </div>

      {/* Filtering and Logging Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="শিক্ষার্থীর নাম অথবা মোবাইল নম্বর খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500/30 transition-all font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Dropdown Selectors */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            
            {/* SMS Type Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none font-semibold cursor-pointer py-0.5"
              >
                {messageTypes.map((t) => (
                  <option key={t} value={t} className="bg-slate-950 text-slate-300">
                    {t === 'All' ? 'সব ধরনের SMS' : t}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none font-semibold cursor-pointer py-0.5"
              >
                <option value="All" className="bg-slate-950 text-slate-300">সকল স্ট্যাটাস</option>
                <option value="Success" className="bg-slate-950 text-emerald-400">সফল (Success)</option>
                <option value="Failed" className="bg-slate-950 text-rose-400">ব্যর্থ (Failed)</option>
              </select>
            </div>

            {/* Batch Resend Failed SMS Button */}
            {filteredLogs.some(l => l.status === 'Failed') && (
              <button
                onClick={handleResendAllFailed}
                disabled={batchResending}
                className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                title="ফিল্টারকৃত সকল ব্যর্থ SMS পুনরায় পাঠান"
              >
                <RotateCw className={`w-3.5 h-3.5 ${batchResending ? 'animate-spin' : ''}`} />
                <span>ব্যর্থ SMS পুনরায় পাঠান ({filteredLogs.filter(l => l.status === 'Failed').length})</span>
              </button>
            )}

          </div>

        </div>
      </div>

      {/* Logs Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-400">কোনো SMS লগ পাওয়া যায়নি</p>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  আপনার অনুসন্ধান অথবা ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider select-none">
                  <th className="p-4 w-44">তারিখ ও সময়</th>
                  <th className="p-4">শিক্ষার্থীর নাম</th>
                  <th className="p-4">অভিভাবক ও নম্বর</th>
                  <th className="p-4">মেসেজ ক্যাটাগরি</th>
                  <th className="p-4">বার্তা বিবরণ</th>
                  <th className="p-4 text-center w-24">স্ট্যাটাস</th>
                  <th className="p-4 text-center w-36">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/40 transition duration-150 group">
                    
                    {/* Date/Time */}
                    <td className="p-4 font-medium text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>{formatTimestamp(log.created_at)}</span>
                      </div>
                    </td>

                    {/* Student Name */}
                    <td className="p-4 font-bold text-slate-200">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>{log.student_name}</span>
                      </div>
                    </td>

                    {/* Parents phone number & role */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded-md">
                          {log.recipient_role === 'Father' ? 'বাবা (Father)' : 'মা (Mother)'}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-300">
                          <Phone className="w-3 h-3 text-slate-600 shrink-0" />
                          <span>{log.phone_number}</span>
                        </div>
                      </div>
                    </td>

                    {/* Message Category Badge */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${getTypeBadgeStyle(log.message_type)}`}>
                        {log.message_type}
                      </span>
                    </td>

                    {/* Truncated message text */}
                    <td className="p-4 max-w-xs md:max-w-sm truncate text-slate-300">
                      <p className="truncate font-sans font-medium" title={log.message_content}>
                        {log.message_content}
                      </p>
                    </td>

                    {/* Status badge */}
                    <td className="p-4 text-center whitespace-nowrap">
                      {log.status === 'Success' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>সফল</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          <XCircle className="w-3 h-3 shrink-0" />
                          <span>ব্যর্থ</span>
                        </span>
                      )}
                    </td>

                    {/* Actions button */}
                    <td className="p-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {log.status === 'Failed' && (
                          <button
                            onClick={() => handleResendSingle(log)}
                            disabled={resendingLogIds.includes(log.id) || batchResending}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold shadow-sm disabled:opacity-50"
                            title="এই SMS টি পুনরায় পাঠান"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${resendingLogIds.includes(log.id) ? 'animate-spin' : ''}`} />
                            <span>পুনরায় পাঠান</span>
                          </button>
                        )}
                        <button
                          onClick={() => setActiveLogModal(log)}
                          className="p-1.5 bg-slate-950 group-hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 text-[10px] font-bold shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>বিস্তারিত</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Total stats bar */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-850 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 gap-2 select-none">
          <div>
            ড্যাশবোর্ডে মোট <strong className="text-slate-400 font-mono">{filteredLogs.length}</strong> টি SMS লগ প্রদর্শিত হচ্ছে।
          </div>
          <div className="font-mono text-slate-600">
            SECURE REST GATEWAY v3.0
          </div>
        </div>

      </div>

      {/* SMS Inspector Modal */}
      {activeLogModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center select-none">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">SMS লগ ডিটেইলস ইন্সপেক্টর</h3>
              </div>
              <button 
                onClick={() => setActiveLogModal(null)}
                className="text-xs text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded-lg transition cursor-pointer font-bold font-mono"
              >
                ESC
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto">
              
              {/* Core Attributes Panel */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 text-[11px] font-medium leading-relaxed">
                <div>
                  <span className="text-slate-500 block uppercase text-[8px] tracking-wider font-bold">শিক্ষার্থীর নাম</span>
                  <span className="text-slate-200 font-bold text-xs">{activeLogModal.student_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[8px] tracking-wider font-bold">ডেলিভারির তারিখ ও সময়</span>
                  <span className="text-slate-200 font-mono">{formatTimestamp(activeLogModal.created_at)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[8px] tracking-wider font-bold">অভিভাবক ও মোবাইল</span>
                  <span className="text-slate-200 block">{activeLogModal.recipient_role === 'Father' ? 'বাবার নম্বর (Father)' : 'মায়ের নম্বর (Mother)'}</span>
                  <span className="text-emerald-400 font-mono font-bold select-all">{activeLogModal.phone_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[8px] tracking-wider font-bold">মেসেজ ক্যাটাগরি ও স্ট্যাটাস</span>
                  <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 ${getTypeBadgeStyle(activeLogModal.message_type)}`}>
                    {activeLogModal.message_type}
                  </span>
                  <div className="mt-1">
                    {activeLogModal.status === 'Success' ? (
                      <span className="text-emerald-400 font-bold">✓ সফল (Success)</span>
                    ) : (
                      <span className="text-rose-400 font-bold">✗ ব্যর্থ (Failed)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="space-y-1.5">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">SMS বার্তার মূল লেখা (Bengali Text):</span>
                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-xs text-slate-300 leading-relaxed font-sans font-medium select-all">
                  {activeLogModal.message_content}
                </div>
              </div>

              {/* Server raw response JSON/Text logs */}
              <div className="space-y-1.5">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Automas API রেসপন্স লগ (response_raw):</span>
                <pre className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-[10px] text-slate-400 leading-relaxed font-mono select-all overflow-x-auto whitespace-pre-wrap max-h-40">
                  {activeLogModal.response_raw || 'No raw API log recorded.'}
                </pre>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex gap-2 select-none">
              {activeLogModal.status === 'Failed' && (
                <button
                  onClick={() => handleResendSingle(activeLogModal)}
                  disabled={resendingLogIds.includes(activeLogModal.id) || batchResending}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider text-center active:scale-95 transition-all cursor-pointer border border-rose-500/50 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${resendingLogIds.includes(activeLogModal.id) ? 'animate-spin' : ''}`} />
                  <span>পুনরায় পাঠান</span>
                </button>
              )}
              <button
                onClick={() => setActiveLogModal(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-xl text-xs uppercase tracking-wider text-center active:scale-95 transition-all cursor-pointer border border-slate-700/50"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Admin Password Verification Modal for SMS Service Toggle */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => {
              if (!pwModalLoading) {
                setShowPasswordModal(false);
                setPwModalPassword('');
                setPwModalError(null);
              }
            }}
          />

          {/* Modal Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative z-10 overflow-hidden animate-fade-in text-slate-200">
            {/* Ambient visual glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-3 text-emerald-400">
                <Lock className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-slate-100">অ্যাডমিন সিকিউরিটি ভেরিফিকেশন</h3>
              <p className="text-slate-400 text-xs mt-2 max-w-xs leading-relaxed">
                SMS সার্ভিস {settings.smsServiceEnabled !== false ? 'বন্ধ' : 'চালু'} করার জন্য অনুগ্রহ করে অ্যাডমিন সিকিউরিটি পাসওয়ার্ড প্রদান করুন।
              </p>
            </div>

            <form onSubmit={handleToggleSmsService} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  অ্যাডমিন পাসওয়ার্ড (Admin Password)
                </label>
                <div className="relative">
                  <input
                    type={pwModalShowPassword ? 'text' : 'password'}
                    value={pwModalPassword}
                    onChange={(e) => {
                      setPwModalPassword(e.target.value);
                      setPwModalError(null);
                    }}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm font-mono tracking-widest transition-all pr-10"
                    disabled={pwModalLoading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setPwModalShowPassword(!pwModalShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    disabled={pwModalLoading}
                  >
                    {pwModalShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {pwModalError && (
                <div className="flex items-start gap-2 text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-[11px] leading-relaxed">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{pwModalError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPwModalPassword('');
                    setPwModalError(null);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-750 transition cursor-pointer border border-slate-700/50"
                  disabled={pwModalLoading}
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg border border-emerald-500/30 disabled:opacity-50"
                  disabled={pwModalLoading}
                >
                  {pwModalLoading ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      যাচাই করা হচ্ছে...
                    </>
                  ) : (
                    'নিশ্চিত করুন (Confirm)'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
