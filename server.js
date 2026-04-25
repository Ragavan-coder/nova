import express from 'express';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://nova-vkrx.vercel.app',
    'https://nova-iodj.vercel.app',
    /\.vercel\.app$/
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

const isVercel = process.env.VERCEL === '1';
const storageDir = isVercel ? '/tmp' : __dirname;

const HASHES_FILE = path.join(storageDir, 'backend_hashes.json');
const BATCHES_FILE = path.join(storageDir, 'backend_batches.json');

// Initialize files if not exists
if (!fs.existsSync(HASHES_FILE)) {
  fs.writeFileSync(HASHES_FILE, JSON.stringify([]));
}
if (!fs.existsSync(BATCHES_FILE)) {
  fs.writeFileSync(BATCHES_FILE, JSON.stringify({}));
}

// ── Batch storage for mobile QR verification ──────────────────────
// Save or update a batch (called by frontend whenever a supply chain event happens)
app.post('/api/batch', (req, res) => {
  try {
    const batch = req.body;
    if (!batch || !batch.batchId) {
      return res.status(400).json({ success: false, error: 'batchId is required' });
    }
    const fileContent = fs.readFileSync(BATCHES_FILE, 'utf8');
    const batches = JSON.parse(fileContent);
    batches[batch.batchId] = batch;
    // Also index by masterTransactionId if available
    if (batch.masterTransactionId) {
      batches[batch.masterTransactionId] = batch;
    }
    fs.writeFileSync(BATCHES_FILE, JSON.stringify(batches, null, 2));
    console.log(`[BACKEND] Batch ${batch.batchId} saved/updated for mobile verification`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[BACKEND] Error saving batch:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Retrieve ALL batches (used by frontend to sync state on page load)
app.get('/api/batches', (req, res) => {
  try {
    const fileContent = fs.readFileSync(BATCHES_FILE, 'utf8');
    const batchesObj = JSON.parse(fileContent);
    // Filter out duplicates (masterTransactionId aliases point to same batch)
    const seen = new Set();
    const batchList = [];
    for (const batch of Object.values(batchesObj)) {
      if (batch.batchId && !seen.has(batch.batchId)) {
        seen.add(batch.batchId);
        batchList.push(batch);
      }
    }
    res.status(200).json({ success: true, batches: batchList });
  } catch (err) {
    console.error('[BACKEND] Error fetching all batches:', err);
    res.status(500).json({ success: false, batches: [] });
  }
});

// Retrieve batch data (used by mobile QR scan when localStorage is empty)
app.get('/api/batch/:id', (req, res) => {
  try {
    const { id } = req.params;
    const fileContent = fs.readFileSync(BATCHES_FILE, 'utf8');
    const batches = JSON.parse(fileContent);
    const batch = batches[id];
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    res.status(200).json({ success: true, batch });
  } catch (err) {
    console.error('[BACKEND] Error fetching batch:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/hash', (req, res) => {
  try {
    const data = req.body;
    
    // Read existing hashes
    const fileContent = fs.readFileSync(HASHES_FILE, 'utf8');
    const hashes = JSON.parse(fileContent);
    
    // Append new hash data
    const newEntry = {
      timestamp: new Date().toISOString(),
      ...data
    };
    hashes.push(newEntry);
    
    // Write back
    fs.writeFileSync(HASHES_FILE, JSON.stringify(hashes, null, 2));
    
    console.log(`[BACKEND] Securely logged hash for role: ${data.role}`);
    res.status(200).json({ success: true, message: 'Hash securely stored.' });
  } catch (err) {
    console.error('[BACKEND] Error storing hash:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/master-hash', (req, res) => {
  try {
    const { batchId } = req.body;
    const fileContent = fs.readFileSync(HASHES_FILE, 'utf8');
    const hashes = JSON.parse(fileContent);
    const batchHashes = hashes.filter((h) => h.batchId === batchId);
    if (batchHashes.length === 0) {
      return res.status(404).json({ success: false, error: 'No hashes found for this batch.' });
    }
    const combinedString = batchHashes.map((h) => h.hash).join('');
    const masterTransactionId = crypto.createHash('sha256').update(combinedString).digest('hex');
    res.status(200).json({ success: true, masterTransactionId });
  } catch (err) {
    console.error('[BACKEND] Error generating master hash:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'cybersafety9870@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD || '' // Requires an App Password from Google
  }
});

app.post('/api/check-expiry', async (req, res) => {
  try {
    const { batchId, medicineName, expiryDate } = req.body;
    
    // Calculate days until expiry
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = Math.abs(expiry.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // Check if within 30 days
    if (diffDays <= 30) {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'cybersafety9870@gmail.com',
        to: `23cc043@nandhaengg.org, ${process.env.EMAIL_USER || 'cybersafety9870@gmail.com'}`,
        subject: `🚨 URGENT: Expiry Alert for Batch ${batchId}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #dc2626;">Project NOVA Expiry Alert</h2>
            <p><strong>Medicine:</strong> ${medicineName}</p>
            <p><strong>Batch ID:</strong> ${batchId}</p>
            <p><strong>Expiry Date:</strong> ${expiry.toLocaleDateString()}</p>
            <p>This batch is expiring in <strong>${diffDays} days</strong>! Please take immediate action.</p>
          </div>
        `
      };

      // Only attempt to send if password is provided, otherwise log a mock send
      if (process.env.EMAIL_APP_PASSWORD) {
        await transporter.sendMail(mailOptions);
        console.log(`[BACKEND] 📧 Expiry alert email sent for ${batchId}`);
      } else {
        console.log(`[BACKEND] ⚠️ (MOCK) Expiry alert email triggered for ${batchId}. Set EMAIL_APP_PASSWORD to actually send.`);
      }
      return res.status(200).json({ success: true, alertSent: true, diffDays });
    }
    
    res.status(200).json({ success: true, alertSent: false, diffDays });
  } catch (err) {
    console.error('[BACKEND] Error checking expiry:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/tamper-alert', async (req, res) => {
  try {
    const { batchId, medicineName, reason, location } = req.body;
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'cybersafety9870@gmail.com',
      to: `23cc043@nandhaengg.org, ${process.env.EMAIL_USER || 'cybersafety9870@gmail.com'}`,
      subject: `🚨 CRITICAL TAMPER ALERT: Batch ${batchId} Compromised`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 2px solid #dc2626; border-radius: 8px;">
          <h2 style="color: #dc2626;">Project NOVA Integrity Breach Detected</h2>
          <p><strong>Medicine:</strong> ${medicineName || 'Unknown'}</p>
          <p><strong>Batch ID:</strong> ${batchId}</p>
          <p><strong>Reason:</strong> ${reason || 'Data tampering detected in UX/UI.'}</p>
          <p><strong>Last Known Location:</strong> ${location || 'Unknown'}</p>
          <p style="color: #dc2626; font-weight: bold;">Immediate action required. Do not administer this batch.</p>
        </div>
      `
    };

    if (process.env.EMAIL_APP_PASSWORD) {
      await transporter.sendMail(mailOptions);
      console.log(`[BACKEND] 📧 Tamper alert email sent for ${batchId}`);
    } else {
      console.log(`[BACKEND] ⚠️ (MOCK) Tamper alert email triggered for ${batchId}. Set EMAIL_APP_PASSWORD to actually send.`);
    }
    
    res.status(200).json({ success: true, alertSent: true });
  } catch (err) {
    console.error('[BACKEND] Error sending tamper alert:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Incomplete transaction monitor - called by frontend when a batch has been in a stage for too long
app.post('/api/incomplete-alert', async (req, res) => {
  try {
    const { batchId, medicineName, currentStage, stagedAt } = req.body;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'cybersafety9870@gmail.com',
      to: `23cc043@nandhaengg.org, ${process.env.EMAIL_USER || 'cybersafety9870@gmail.com'}`,
      subject: `⚠️ Incomplete Transaction Alert: Batch ${batchId}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 2px solid #f59e0b; border-radius: 8px;">
          <h2 style="color: #d97706;">Project NOVA — Incomplete Transaction Detected</h2>
          <p><strong>Medicine:</strong> ${medicineName || 'Unknown'}</p>
          <p><strong>Batch ID:</strong> ${batchId}</p>
          <p><strong>Current Stage:</strong> ${currentStage}</p>
          <p><strong>Stuck Since:</strong> ${new Date(stagedAt).toLocaleString()}</p>
          <p style="color: #d97706; font-weight: bold;">This batch has not progressed to the next stage in time. Please investigate.</p>
        </div>
      `
    };

    if (process.env.EMAIL_APP_PASSWORD) {
      await transporter.sendMail(mailOptions);
      console.log(`[BACKEND] 📧 Incomplete transaction alert sent for ${batchId}`);
    } else {
      console.log(`[BACKEND] ⚠️ (MOCK) Incomplete transaction alert triggered for ${batchId}`);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[BACKEND] Error sending incomplete alert:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`Backend server running securely on port ${PORT}`);
  });
}

export default app;
