/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { supabase, fetchAllDataFromSupabase, saveCollectionToSupabase } from "./src/lib/supabase";

dotenv.config({ override: true });

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Read configuration from environment variables with bcrypt hashing
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || 
  bcrypt.hashSync(process.env.ADMIN_PASSWORD || "2010636075", 10);
const AUTOMAS_SMS_API_KEY = process.env.AUTOMAS_SMS_API_KEY || "510b17b71592af35dac9cba3d019dc30";
const AUTOMAS_SMS_SENDER_ID = process.env.AUTOMAS_SMS_SENDER_ID || "8809617639923";

/**
 * Helper to securely verify password against bcrypt hash
 */
function verifyPassword(password: string | undefined | null): boolean {
  if (!password || typeof password !== 'string') return false;

  const envPass = process.env.ADMIN_PASSWORD || "2010636075";
  const envHash = process.env.ADMIN_PASSWORD_HASH;

  // 1. Direct match with plain text password or fallback default
  if (password === envPass || password === "2010636075") {
    return true;
  }

  if (envHash && password === envHash) {
    return true;
  }

  // 2. Verify with bcrypt if envHash or ADMIN_PASSWORD_HASH is a valid bcrypt hash string
  if (envHash && (envHash.startsWith('$2a$') || envHash.startsWith('$2b$') || envHash.startsWith('$2y$'))) {
    try {
      if (bcrypt.compareSync(password, envHash)) {
        return true;
      }
    } catch (e) {
      // ignore
    }
  }

  if (ADMIN_PASSWORD_HASH && (ADMIN_PASSWORD_HASH.startsWith('$2a$') || ADMIN_PASSWORD_HASH.startsWith('$2b$') || ADMIN_PASSWORD_HASH.startsWith('$2y$'))) {
    try {
      if (bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
        return true;
      }
    } catch (e) {
      // ignore
    }
  }

  return false;
}

// Initialize Socket.IO Server for bi-directional real-time state synchronization
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  socket.on("join", () => {
    socket.join("app_room");
  });

  socket.on("data:update", (payload) => {
    socket.broadcast.emit("data:update", payload);
  });

  socket.on("data:reset", (payload) => {
    socket.broadcast.emit("data:reset", payload);
  });
});

// Directory for local file uploads (PDFs, question papers, logos)
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (e) {
    console.error("Failed to create uploads directory:", e);
  }
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Security Authentication Middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req.headers['x-admin-password'] || req.query.auth) as string;
  if (!verifyPassword(token)) {
    return res.status(401).json({ error: "Unauthorized access. Invalid password." });
  }
  next();
}

// Active Server-Sent Events clients for real-time synchronization
interface SseClient {
  id: string;
  res: express.Response;
}
let sseClients: SseClient[] = [];

// API Endpoints
// Password challenge endpoint
app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  if (verifyPassword(password)) {
    return res.json({ success: true, token: password });
  }
  return res.status(401).json({ success: false, error: "Incorrect admin password" });
});

// Proxy route for automated SMS sending to sms.automas.com.bd Cloud REST API (v3)
app.post('/api/send-sms', authMiddleware, async (req, res) => {
  try {
    const { data: settingsData } = await supabase.from('settings').select('sms_service_enabled').limit(1);
    if (settingsData && settingsData.length > 0 && settingsData[0].sms_service_enabled === false) {
      return res.json({ success: false, error: "SMS service is currently disabled by the administrator." });
    }
  } catch (err) {
    console.warn("Could not check sms_service_enabled setting from Supabase:", err);
  }

  const rawNumber = req.body.number || req.body.msisdn;
  const message = req.body.message || req.body.smstext;

  if (!rawNumber || !message) {
    return res.status(400).json({ error: "Missing recipient number or message body" });
  }

  // Sanitize phone number (remove non-digits)
  let cleanNumber = String(rawNumber).trim().replace(/\D/g, '');
  if (cleanNumber.length === 11 && cleanNumber.startsWith('01')) {
    cleanNumber = '88' + cleanNumber; // Ensure 8801... standard BD format
  }

  const apiKey = req.body.apikey || AUTOMAS_SMS_API_KEY;
  const senderId = req.body.sender || AUTOMAS_SMS_SENDER_ID;
  const smsFormat = req.body.smsformat || "8";

  console.log(`[sms.automas.com.bd API v3] Initiating dispatch to number: ${cleanNumber} (raw: ${rawNumber})`);

  try {
    const payload = new URLSearchParams({
      apikey: apiKey,
      sender: senderId,
      msisdn: cleanNumber,
      smstext: message,
      smsformat: String(smsFormat)
    });

    const response = await fetch('https://api.automas.com.bd/smsapiv3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    });

    const responseText = await response.text();
    let responseJson: any = {};
    try {
      responseJson = JSON.parse(responseText);
    } catch {}

    let isSuccess = false;
    let errorMessage = "";

    if (response.ok) {
      let items: any[] = [];
      if (Array.isArray(responseJson)) {
        items = responseJson;
      } else if (responseJson && Array.isArray(responseJson.response)) {
        items = responseJson.response;
      } else if (responseJson && typeof responseJson === 'object' && responseJson.status !== undefined) {
        items = [responseJson];
      }

      if (items.length > 0) {
        const firstItem = items[0];
        const statusCode = Number(firstItem.status);
        if (firstItem.status !== undefined && statusCode === 0) {
          isSuccess = true;
        } else {
          isSuccess = false;
          const statusMap: Record<number, string> = {
            100: "Invalid API Request or Parameters",
            101: "Invalid API Key or Account Inactive",
            102: "Invalid Sender ID (ভুল সেন্ডার আইডি)",
            103: "Insufficient SMS Balance (অপর্যাপ্ত এসএমএস ব্যালেন্স)",
            104: "Invalid SMS Format or Message Text",
            105: "Invalid Mobile Number (ভুল মোবাইল নম্বর)",
            106: "Automas Authentication Failed / Invalid API Key (এপিআই কি সঠিক নয়)",
            107: "IP Restricted by Automas Gateway",
            108: "Content Blocked by Gateway Spam Filter"
          };
          errorMessage = statusMap[statusCode] || `Automas Gateway return status code ${statusCode}`;
        }
      } else {
        const lower = responseText.toLowerCase();
        if ((lower.includes('success') || lower.includes('sent')) && !lower.includes('error') && !lower.includes('fail') && !lower.includes('106')) {
          isSuccess = true;
        } else {
          errorMessage = responseText || "Unsuccessful response from Automas SMS gateway";
        }
      }
    } else {
      errorMessage = `HTTP Error ${response.status}: ${responseText || 'Gateway Server error'}`;
    }

    if (isSuccess) {
      console.log(`✓ sms.automas.com.bd v3 successfully sent message to ${cleanNumber}:`, responseText);
      return res.json({ success: true, data: responseJson });
    } else {
      console.warn(`✗ sms.automas.com.bd v3 returned unsuccessful response for ${cleanNumber}:`, errorMessage, responseText);
      return res.status(400).json({
        success: false,
        error: errorMessage,
        data: responseJson
      });
    }
  } catch (err: any) {
    console.error(`✗ sms.automas.com.bd v3 dispatch system error for ${cleanNumber}:`, err.message || err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// In-memory cache for the last successfully retrieved SMS balance
let lastKnownSmsBalance: string = "0.00";

async function updateSmsBalanceCache() {
  try {
    const apiKey = AUTOMAS_SMS_API_KEY;
    if (!apiKey) return;
    const res = await fetch(`https://api.automas.com.bd/getbalancev3?apikey=${apiKey}&_=${Date.now()}`);
    if (res.ok) {
      const text = await res.text();
      let json: any = {};
      try { json = JSON.parse(text); } catch { json = { response: text.trim() }; }
      const val = json.balance !== undefined ? json.balance : (json.response !== undefined ? json.response : json.balance_amount);
      if (val !== undefined && val !== null && !isNaN(parseFloat(String(val)))) {
        lastKnownSmsBalance = parseFloat(String(val)).toFixed(2);
        console.log(`[sms.automas.com.bd] Synchronized live SMS balance cache: ৳${lastKnownSmsBalance}`);
      }
    }
  } catch (err: any) {
    console.log("[sms.automas.com.bd] Initial balance sync skipped:", err.message || err);
  }
}
updateSmsBalanceCache();

// Proxy route for fetching current SMS balance from Automas API
app.get('/api/sms-balance', authMiddleware, async (req, res) => {
  const apiKey = req.query.apikey || AUTOMAS_SMS_API_KEY;
  try {
    const response = await fetch(`https://api.automas.com.bd/getbalancev3?apikey=${apiKey}&_=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const responseText = await response.text();
    let responseJson: any = {};
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { response: responseText.trim() };
    }

    let balanceVal = "";
    if (responseJson.balance !== undefined) {
      balanceVal = String(responseJson.balance);
    } else if (responseJson.response !== undefined) {
      balanceVal = String(responseJson.response);
    } else if (responseJson.balance_amount !== undefined) {
      balanceVal = String(responseJson.balance_amount);
    } else {
      const keys = Object.keys(responseJson);
      const foundKey = keys.find(k => k.toLowerCase().includes('balance') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('credit'));
      if (foundKey && responseJson[foundKey] !== undefined) {
        balanceVal = String(responseJson[foundKey]);
      }
    }

    if (balanceVal && !isNaN(parseFloat(balanceVal))) {
      lastKnownSmsBalance = parseFloat(balanceVal).toFixed(2);
    }

    return res.json({
      success: true,
      balance: balanceVal || lastKnownSmsBalance,
      response: balanceVal || lastKnownSmsBalance,
      raw: responseJson
    });
  } catch (err: any) {
    console.log("Using cached SMS balance status:", err.message);
    return res.json({ 
      balance: lastKnownSmsBalance || "0.00", 
      response: lastKnownSmsBalance || "0.00",
      offline: true, 
      error: err.message || "Failed to fetch live SMS balance" 
    });
  }
});

// POST endpoint to update the in-memory lastKnownSmsBalance cache
app.post('/api/sms-balance', authMiddleware, (req, res) => {
  const { balance } = req.body;
  if (balance && !isNaN(parseFloat(balance))) {
    lastKnownSmsBalance = parseFloat(balance).toFixed(2);
    return res.json({ success: true, balance: lastKnownSmsBalance });
  }
  return res.status(400).json({ error: "Invalid balance format" });
});

// File Upload Endpoint
app.post('/api/upload', authMiddleware, (req, res) => {
  const { fileName, fileData } = req.body;
  if (!fileName || !fileData) {
    return res.status(400).json({ error: "Missing file name or base64 file data" });
  }

  try {
    let base64Data = fileData;
    if (fileData.includes(';base64,')) {
      base64Data = fileData.split(';base64,').pop();
    }
    const buffer = Buffer.from(base64Data, 'base64');
    
    const ext = path.extname(fileName) || '.pdf';
    const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueFileName = `${baseName}_${Date.now()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${uniqueFileName}`;
    return res.json({ success: true, url: fileUrl, name: fileName, size: buffer.length });
  } catch (err: any) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: err.message || "Failed to save file on server" });
  }
});

const DB_FILE_PATH = path.join(UPLOADS_DIR, 'server_storage.json');

function loadLocalServerDb(): Record<string, any> {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn("Failed reading local server db:", e);
  }
  return {
    students: [],
    attendance: [],
    folders: [
      { id: 'f-1', name: 'Mathematics Core', type: 'question', parentId: null },
      { id: 'f-2', name: 'Science Mechanics & Light', type: 'question', parentId: null },
      { id: 'f-3', name: 'General Science Questions', type: 'question', parentId: null },
      { id: 'f-4', name: 'Exam Sheets 2026', type: 'document', parentId: null },
      { id: 'f-5', name: 'Lecture Modules', type: 'document', parentId: null },
    ],
    questions: [],
    documents: [],
    presentations: [],
    activities: [],
    settings: {
      instituteName: 'Math & Science Care',
      logoUrl: '/app_logo.jpg',
      themeAccent: 'emerald',
      darkMode: true,
      customFooterText: 'Cared by: Nion Hassan Nirjon',
      autoSaveInterval: 10,
      smsServiceEnabled: true,
    },
    exams: [],
    examResults: [],
    uploadedFiles: [],
    feePayments: [],
    sms_logs: []
  };
}

function saveLocalServerDb(db: Record<string, any>) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed writing local server db:", e);
  }
}

// Full state read (Supabase + Local file store fallback)
app.get('/api/data', authMiddleware, async (req, res) => {
  const localDb = loadLocalServerDb();
  try {
    const supabaseDb = await fetchAllDataFromSupabase();
    if (supabaseDb) {
      Object.keys(supabaseDb).forEach((k) => {
        const val = (supabaseDb as any)[k];
        if (Array.isArray(val) && val.length > 0) {
          localDb[k] = val;
        } else if (val && typeof val === 'object' && Object.keys(val).length > 0 && k === 'settings') {
          localDb[k] = val;
        }
      });
      saveLocalServerDb(localDb);
    }
  } catch (err: any) {
    console.warn("Notice: Supabase fetch skipped, returning local server db:", err.message || err);
  }
  return res.json(localDb);
});

// Partial update to server store & broadcast to active sessions
app.post('/api/data', authMiddleware, async (req, res) => {
  const { key, data, clientId } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Missing collection key" });
  }

  try {
    const localDb = loadLocalServerDb();

    // Constraint violation check for fee payments
    if (key === 'feePayments') {
      const existingPayments = localDb.feePayments || [];
      const oldPaidPayments = existingPayments.filter((p: any) => p.status === 'Paid');
      const incomingList = Array.isArray(data) ? data : [data];
      for (const oldPay of oldPaidPayments) {
        const incomingPay = incomingList.find((p: any) => p.id === oldPay.id);
        if (!incomingPay) {
          const student = (localDb.students || []).find((s: any) => s.id === oldPay.studentId);
          if (student) {
            return res.status(400).json({ error: "Constraint violation: Cannot delete a record that is already marked as Paid." });
          }
        } else {
          if (
            incomingPay.status !== 'Paid' ||
            Number(incomingPay.amount) !== Number(oldPay.amount) ||
            Number(incomingPay.paidAmount) !== Number(oldPay.paidAmount) ||
            incomingPay.paymentDate !== oldPay.paymentDate ||
            incomingPay.studentId !== oldPay.studentId ||
            incomingPay.month !== oldPay.month
          ) {
            return res.status(400).json({ error: "Constraint violation: Once a fee is marked as Paid, it is locked and cannot be modified." });
          }
        }
      }
    }

    localDb[key] = data;
    saveLocalServerDb(localDb);

    // Sync to Supabase in background
    saveCollectionToSupabase(key, data).catch((err) => {
      console.warn(`Supabase background save notice for ${key}:`, err.message || err);
    });

    // Broadcast delta via Socket.IO and SSE to connected clients
    const eventPayload = { key, data, clientId };
    io.emit("data:update", eventPayload);

    const payload = JSON.stringify(eventPayload);
    sseClients.forEach((client) => {
      if (client.id !== clientId) {
        try {
          client.res.write(`data: ${payload}\n\n`);
        } catch (e) {
          console.error("Failed to write to client stream:", e);
        }
      }
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error(`Error saving collection ${key}:`, err);
    return res.status(500).json({ error: err.message || "Failed to update server database" });
  }
});

// Reset database and broadcast
app.post('/api/reset', authMiddleware, async (req, res) => {
  const { clientId } = req.body;
  try {
    const defaultDb = {
      students: [],
      attendance: [],
      folders: [
        { id: 'f-1', name: 'Mathematics Core', type: 'question', parentId: null },
        { id: 'f-2', name: 'Science Mechanics & Light', type: 'question', parentId: null },
        { id: 'f-3', name: 'General Science Questions', type: 'question', parentId: null },
        { id: 'f-4', name: 'Exam Sheets 2026', type: 'document', parentId: null },
        { id: 'f-5', name: 'Lecture Modules', type: 'document', parentId: null },
      ],
      questions: [],
      documents: [],
      presentations: [],
      activities: [],
      settings: {
        instituteName: 'Math & Science Care',
        logoUrl: '/app_logo.jpg',
        themeAccent: 'emerald',
        darkMode: true,
        customFooterText: 'Cared by: Nion Hassan Nirjon',
        autoSaveInterval: 10,
        smsServiceEnabled: true,
      },
      exams: [],
      examResults: [],
      uploadedFiles: [],
      feePayments: [],
      sms_logs: []
    };
    saveLocalServerDb(defaultDb);

    try {
      await supabase.from('attendance').delete().neq('id', '___');
      await supabase.from('exam_results').delete().neq('id', '___');
      await supabase.from('exams').delete().neq('id', '___');
      await supabase.from('fee_payments').delete().neq('id', '___');
      await supabase.from('students').delete().neq('id', '___');
      await supabase.from('questions').delete().neq('id', '___');
      await supabase.from('documents').delete().neq('id', '___');
      await supabase.from('presentations').delete().neq('id', '___');
      await supabase.from('activities').delete().neq('id', '___');
      await supabase.from('uploaded_files').delete().neq('id', '___');
      await supabase.from('sms_logs').delete().neq('id', '___');
    } catch (e: any) {
      console.warn("Supabase reset notice:", e.message || e);
    }

    // Broadcast reset event via Socket.IO and SSE
    const eventPayload = { reset: true, clientId };
    io.emit("data:reset", eventPayload);

    const payload = JSON.stringify(eventPayload);
    sseClients.forEach((client) => {
      if (client.id !== clientId) {
        try {
          client.res.write(`data: ${payload}\n\n`);
        } catch (e) {
          console.error("Failed to write to client stream during reset:", e);
        }
      }
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Error resetting database:", err);
    return res.status(500).json({ error: err.message || "Failed to reset database" });
  }
});

// SSE Stream endpoint for live updates
app.get('/api/sync/stream', (req, res) => {
  const authVal = req.query.auth as string;
  if (!verifyPassword(authVal)) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write('event: error\ndata: Unauthorized\n\n');
    return res.end();
  }

  const clientId = (req.query.clientId as string) || 'unknown';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write(': keepalive\n\n');

  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (e) {
      clearInterval(pingInterval);
    }
  }, 25000);

  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients = sseClients.filter(c => c.res !== res);
  });
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Fatal error starting server:", err);
});
