/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config({ override: true });

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const ADMIN_PASSWORD = "2010636075";
const DB_FILE = path.join(process.cwd(), 'database.json');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initial Seed Data (matching types.ts structure)
const INITIAL_DB = {
  students: [],
  attendance: [],
  folders: [
    { id: 'f-1', name: 'Mathematics Core', type: 'question', parentId: null },
    { id: 'f-2', name: 'Science Mechanics & Light', type: 'question', parentId: null },
    { id: 'f-3', name: 'General Science Questions', type: 'question', parentId: null },
    { id: 'f-4', name: 'Exam Sheets 2026', type: 'document', parentId: null },
    { id: 'f-5', name: 'Lecture Modules', type: 'document', parentId: null }
  ],
  questions: [
    {
      id: 'q-1',
      title: 'Algebraic Identity Proof',
      content: 'Prove the standard algebraic identity $(a+b)^2 = a^2 + 2ab + b^2$ using geometric area decomposition. Draw or describe a square of side length $(a+b)$ subdivided into smaller squares and rectangles.',
      subject: 'Math',
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
      subject: 'Math',
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
      subject: 'Physics',
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
      subject: 'Chemistry',
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
      subject: 'Biology',
      chapter: 'Plant Physiology',
      classLevel: 'Class 5',
      difficulty: 'Medium',
      tags: ['Photosynthesis', 'Plants', 'Biology'],
      isFavorite: false,
      isArchived: false,
      folderId: 'f-3',
      createdAt: '2026-07-05T16:20:00Z',
    }
  ],
  documents: [
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
  ],
  presentations: [
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
  ],
  activities: [
    { id: 'act-1', timestamp: '2026-07-10T10:00:00Z', module: 'System', action: 'Database Initialized', details: 'Tuition portal fully initialized with realistic demonstration records.', type: 'success' },
    { id: 'act-2', timestamp: '2026-07-10T11:15:00Z', module: 'Question Bank', action: 'Question Created', details: 'Created redox balancing question in organic chemistry.', type: 'info' },
    { id: 'act-3', timestamp: '2026-07-10T14:30:00Z', module: 'Attendance', action: 'Attendance Recorded', details: 'Daily attendance initialized for Class 9 Delta Batch.', type: 'warning' },
    { id: 'act-4', timestamp: '2026-07-10T16:02:00Z', module: 'Attendance', action: 'Student Logged', details: 'Abrar Shahriar marked PRESENT for Alpha Batch.', type: 'success' },
    { id: 'act-5', timestamp: '2026-07-10T17:05:00Z', module: 'Documents', action: 'Document Compiled', details: 'Compiled "HSC Weekly Quiz: Calculus Limits" as a clean PDF.', type: 'info' }
  ],
  settings: {
    instituteName: 'Math & Science Care',
    logoUrl: '/app_logo.jpg',
    themeAccent: 'emerald',
    darkMode: true,
    customFooterText: 'Cared by: Nion Hassan Nirjon',
    autoSaveInterval: 10,
    smsServiceEnabled: true
  },
  exams: [],
  examResults: [],
  uploadedFiles: [],
  feePayments: [],
  sms_logs: []
};

// Ensure uploads folder exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Database CRUD Helper Functions
function loadDb(): any {
  if (!fs.existsSync(DB_FILE)) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
    } catch (e) {
      console.error("Error creating database file:", e);
    }
    return INITIAL_DB;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.uploadedFiles) {
      parsed.uploadedFiles = [];
    }
    if (!parsed.feePayments) {
      parsed.feePayments = [];
    }
    if (!parsed.sms_logs) {
      parsed.sms_logs = [];
    }
    return parsed;
  } catch (e) {
    console.error("Error parsing database.json, using initial state:", e);
    return INITIAL_DB;
  }
}

function saveDb(data: any): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error writing database.json:", e);
  }
}

// Security Authentication Middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers['x-admin-password'] || req.query.auth;
  if (token !== ADMIN_PASSWORD) {
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
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: ADMIN_PASSWORD });
  }
  return res.status(401).json({ success: false, error: "Incorrect admin password" });
});

// Proxy route for automated SMS sending to sms.automas.com.bd Cloud REST API (v3)
app.post('/api/send-sms', authMiddleware, async (req, res) => {
  const db = loadDb();
  if (db.settings && db.settings.smsServiceEnabled === false) {
    return res.json({ success: false, error: "SMS service is currently disabled by the administrator." });
  }

  const rawNumber = req.body.number || req.body.msisdn;
  const message = req.body.message || req.body.smstext;

  if (!rawNumber || !message) {
    return res.status(400).json({ error: "Missing recipient number or message body" });
  }

  // Sanitize phone number (remove non-digits like '+', spaces, or dashes)
  let cleanNumber = String(rawNumber).trim().replace(/\D/g, '');
  if (cleanNumber.length === 11 && cleanNumber.startsWith('01')) {
    cleanNumber = '88' + cleanNumber; // Ensure 8801... standard BD format for gateway
  }

  const apiKey = req.body.apikey || (process.env.AUTOMAS_SMS_API_KEY && process.env.AUTOMAS_SMS_API_KEY !== "056262a0eba72b8d9f7b14482f38a6d8" ? process.env.AUTOMAS_SMS_API_KEY : "510b17b71592af35dac9cba3d019dc30");
  const senderId = req.body.sender || process.env.AUTOMAS_SMS_SENDER_ID || "8809617639923";
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

    // Parse Automas API response structure & status codes strictly
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
    const apiKey = process.env.AUTOMAS_SMS_API_KEY || "510b17b71592af35dac9cba3d019dc30";
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
  const apiKey = req.query.apikey || process.env.AUTOMAS_SMS_API_KEY || "510b17b71592af35dac9cba3d019dc30";
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
      // If response is raw number or not valid JSON, parse it as { response: text }
      responseJson = { response: responseText.trim() };
    }

    // Attempt to extract balance to update our in-memory cache
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

// POST endpoint to update the in-memory lastKnownSmsBalance cache from client side (GeoIP bypass)
app.post('/api/sms-balance', authMiddleware, (req, res) => {
  const { balance } = req.body;
  if (balance && !isNaN(parseFloat(balance))) {
    lastKnownSmsBalance = parseFloat(balance).toFixed(2);
    console.log(`[sms.automas.com.bd] Synchronized last known live balance cache to: ${lastKnownSmsBalance}`);
    return res.json({ success: true, balance: lastKnownSmsBalance });
  }
  return res.status(400).json({ error: "Invalid balance format" });
});

// File Upload Endpoint (Object Storage simulation)
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
    
    // Create unique file name
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

// Full state read
app.get('/api/data', authMiddleware, (req, res) => {
  const db = loadDb();
  res.json(db);
});

// Partial update & broadcast to active sessions
app.post('/api/data', authMiddleware, (req, res) => {
  const { key, data, clientId } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Missing collection key" });
  }

  const db = loadDb();

  if (key === 'students') {
    const activeStudentIds = new Set(data.map((s: any) => s.id));
    if (db.attendance) {
      db.attendance = db.attendance.filter((a: any) => activeStudentIds.has(a.studentId));
    }
    if (db.feePayments) {
      db.feePayments = db.feePayments.filter((p: any) => activeStudentIds.has(p.studentId));
    }
  }

  if (key === 'feePayments') {
    const existingPayments = db.feePayments || [];
    for (const oldPay of existingPayments) {
      if (oldPay.status === 'Paid') {
        const incomingPay = data.find((p: any) => p.id === oldPay.id);
        if (!incomingPay) {
          const studentExists = db.students && db.students.some((s: any) => s.id === oldPay.studentId);
          if (studentExists) {
            return res.status(400).json({ error: "Constraint violation: Cannot delete a record that is already marked as Paid." });
          }
        }
        if (incomingPay) {
          if (
            incomingPay.status !== 'Paid' ||
            incomingPay.amount !== oldPay.amount ||
            incomingPay.paidAmount !== oldPay.paidAmount ||
            incomingPay.paymentDate !== oldPay.paymentDate ||
            incomingPay.studentId !== oldPay.studentId ||
            incomingPay.month !== oldPay.month
          ) {
            return res.status(400).json({ error: "Constraint violation: Once a fee is marked as Paid, it is locked and cannot be modified." });
          }
        }
      }
    }
  }

  db[key] = data;
  saveDb(db);

  // Broadcast delta to all other connected clients
  const payload = JSON.stringify({ key, data, clientId });
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
});

// Reset database and broadcast
app.post('/api/reset', authMiddleware, (req, res) => {
  const { clientId } = req.body;
  saveDb(INITIAL_DB);

  // Broadcast reset event to all other clients
  const payload = JSON.stringify({ reset: true, clientId });
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
});

// SSE Stream endpoint for live updates
app.get('/api/sync/stream', (req, res) => {
  const authVal = req.query.auth;
  if (authVal !== ADMIN_PASSWORD) {
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

  // Send an initial keepalive comment
  res.write(': keepalive\n\n');

  // Maintain active connection via periodic ping
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
  // Mount Vite middleware in development or serve static built files in production
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
