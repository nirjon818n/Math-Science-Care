/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function DhakaClock() {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Format time in Asia/Dhaka
      try {
        const timeOptions: Intl.DateTimeFormatOptions = {
          timeZone: 'Asia/Dhaka',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        };
        const dateOptions: Intl.DateTimeFormatOptions = {
          timeZone: 'Asia/Dhaka',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        };

        const tStr = new Intl.DateTimeFormat('en-US', timeOptions).format(now);
        const dStr = new Intl.DateTimeFormat('en-US', dateOptions).format(now);

        setTimeStr(tStr);
        setDateStr(dStr);
      } catch (err) {
        // Fallback if Intl fails
        setTimeStr(now.toLocaleTimeString());
        setDateStr(now.toLocaleDateString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 rounded-xl shadow-lg select-none transition-all duration-200 shrink-0">
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </div>
      
      <div className="flex flex-col text-right font-mono">
        <span className="text-xs font-bold text-slate-100 tracking-wide tabular-nums">
          {timeStr || '--:--:-- --'}
        </span>
        <span className="text-[9px] text-slate-500 uppercase font-semibold leading-none mt-0.5 whitespace-nowrap">
          {dateStr ? `${dateStr} (Dhaka BST)` : 'Dhaka Time'}
        </span>
      </div>
    </div>
  );
}
