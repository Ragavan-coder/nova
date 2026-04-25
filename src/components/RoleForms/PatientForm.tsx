import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, User, ShieldCheck, QrCode, ScanLine, AlertTriangle, Database, Activity, Clock, Printer } from 'lucide-react';
import { SecureInputField } from '../SecureInputField';
import { validateForm, PATIENT_SCHEMA } from '../../lib/validation';
import { useBlockchainStore } from '../../lib/store';
import { generateKeyPair, signPayload } from '../../lib/cryptoUtils';
import { VaccineBatch } from '../../lib/types';
import { MedicineQR } from '../MedicineQR';
import VerificationTimeline from '../VerificationTimeline';
import { API_BASE } from '../../lib/api';

export default function PatientForm({ store, onSuccess }: { store: ReturnType<typeof useBlockchainStore>, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    patientId: '', ageGender: '', vaccineName: '', lotId: '',
    adminDate: '', doseNumber: '', clinicianId: '', adminSite: '',
    adverseEvent: 'No', nextDoseDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [workflowError, setWorkflowError] = useState('');
  const [mode, setMode] = useState<'directory' | 'scanner' | 'timeline' | 'form' | 'history'>('directory');
  const [scannedBatch, setScannedBatch] = useState<VaccineBatch | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState('');

  const deliveredBatches = store.batches.filter(b => b.masterTransactionId);

  

  // Auto-scan if batchId is in URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlBatchId = params.get('batchId');
    if (urlBatchId) {
      setScanInput(urlBatchId);
      // Wait for state to settle then scan
      setTimeout(() => {
        document.getElementById('mock-scan-btn')?.click();
      }, 500);
    }
  }, []);

  const handleScanMock = async () => {
    if (!scanInput.trim()) { setScanError('Please enter a valid Master ID or Batch ID.'); return; }
    setScanError('');
    setIsScanning(true);
    setTimeout(async () => {
      let batch = store.verifyBatch(scanInput.trim());
      
      if (!batch) {
        try {
          const res = await fetch(`${API_BASE}/api/batch/${scanInput.trim()}`);
          const data = await res.json();
          if (data.success && data.batch) {
            batch = data.batch;
          }
        } catch (err) {
          console.error('Failed to fetch batch from server', err);
        }
      }

      if (!batch) {
        setScanError('No data found. Ensure the hospital has completed the delivery phase.');
        setIsScanning(false);
        return;
      }
      setScannedBatch(batch);
      setMode('timeline');
      setIsScanning(false);

      if (batch.currentStatus === 'TAMPERED') {
        try {
          await fetch(`${API_BASE}/api/tamper-alert`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchId: batch.batchId, medicineName: batch.name, reason: 'Compromised batch detected during patient scan.', location: 'End User Portal' }) });
        } catch (e) { console.error('Failed to trigger tamper alert', e); }
      }
      try {
        await fetch(`${API_BASE}/api/check-expiry`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId: batch.batchId, medicineName: batch.name, expiryDate: batch.expiryDate }) });
      } catch (e) { console.error(e); }
    }, 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkflowError('');

    const handleFailure = async (msg: string) => {
      setWorkflowError(msg);
      if (store.incrementFailedAttempts()) {
        store.resetFailedAttempts();
        setWorkflowError("⛔ TAMPER ALERT TRIGGERED: Too many failed attempts. Security notified.");
        try {
          await fetch(`${API_BASE}/api/tamper-alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              batchId: formData.lotId || 'UNKNOWN_BATCH',
              medicineName: formData.vaccineName || 'Unknown Medicine',
              reason: 'Multiple failed validation/workflow attempts detected.',
              location: 'Patient Portal'
            })
          });
        } catch (err) {}
      }
    };

    const { valid: sv, errors: se } = validateForm(formData as any, PATIENT_SCHEMA);
    if (!sv) { await handleFailure(`⛔ ${se[0].message}`); return; }

    const err = store.validateWorkflowStep(formData.lotId, 'DELIVERED', 'ADMINISTERED');
    if (err) {
      setWorkflowError(`⛔ ${err}`);
      if (store.incrementWorkflowViolation()) {
        store.resetWorkflowViolation();
        setWorkflowError("🚨 TAMPER ALERT: Unauthorized workflow bypass attempt detected! Security notified.");
        try {
          await fetch(`${API_BASE}/api/tamper-alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              batchId: formData.lotId || 'UNKNOWN_BATCH',
              medicineName: formData.vaccineName || 'Unknown Medicine',
              reason: `Patient attempted to record dose for batch "${formData.lotId}" without prior Hospital delivery approval. This is a workflow bypass attempt.`,
              location: 'Patient Portal'
            })
          });
        } catch (e) {}
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const { privateKey } = generateKeyPair();
      const payload = { ...formData, role: 'Patient' };
      const anonymizedPatientId = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(formData.patientId))
        .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16));
      const payloadToSign = { ...payload, patientId: anonymizedPatientId };
      const { signature, hash } = signPayload(privateKey, payloadToSign);
      await fetch(`${API_BASE}/api/hash`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Patient', batchId: formData.lotId, hash, signature }) });
      store.addEventToBatch(formData.lotId, 'ADMINISTERED', 'Local Clinic', 4.0, 'Patient node');
      setIsSubmitting(false);
      setIsSuccess(true);
      // Removed auto-redirect so it stays on the page until logout
    } catch (err) { console.error(err); setIsSubmitting(false); }
  };

  const printQR = (batch: VaccineBatch) => {
    const win = window.open('', '', 'width=500,height=700');
    if (!win) return;
    const el = document.getElementById(`qr-${batch.batchId}`);
    win.document.write(`<html><head><title>QR - ${batch.name}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;padding:20px;}
      h2{font-size:1.4rem;font-weight:900;margin-bottom:8px;}
      #qr svg{width:260px;height:260px;}
      .id{font-family:monospace;font-size:11px;word-break:break-all;text-align:center;max-width:300px;margin-top:12px;color:#333;font-weight:bold;}
      .label{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:2px;margin-top:6px;}</style></head>
      <body><h2>${batch.name}</h2><div id="qr">${el?.innerHTML || ''}</div>
      <div class="label">Master Transaction ID</div>
      <div class="id">${batch.masterTransactionId}</div>
      <script>setTimeout(()=>{window.print();window.close();},400);</script></body></html>`);
    win.document.close();
  };

  const tabs = [
    { key: 'directory', label: 'Medicine Directory', icon: Database },
    { key: 'scanner',   label: 'Scan QR',            icon: QrCode },
    { key: 'history',   label: 'Transaction History', icon: Activity },
    { key: 'form',      label: 'Record Dose',         icon: User },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-3 rounded-2xl"><User className="w-6 h-6 text-emerald-600" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">End User / Patient Portal</h2>
              <p className="text-slate-500 text-sm">Verified medicine QR codes, transaction history, and administration records.</p>
            </div>
          </div>
          {/* Tab bar */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setMode(tab.key as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${mode === tab.key ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {/* ── Medicine Directory ── */}
            {mode === 'directory' && (
              <motion.div key="directory" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-500" /> All Processed Medicines
                </h3>
                {deliveredBatches.length === 0 ? (
                  <p className="text-slate-400 text-center py-14 bg-slate-50 rounded-2xl border border-slate-100">
                    No medicines have completed the full supply chain yet. <br />Complete the hospital delivery phase to generate QR codes.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                          <th className="px-5 py-3">Medicine</th>
                          <th className="px-5 py-3">Batch ID</th>
                          <th className="px-5 py-3">Expiry</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-center">QR Code</th>
                          <th className="px-5 py-3 text-center">Print</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {deliveredBatches.map(batch => (
                          <tr key={batch.batchId} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-800">{batch.name}</p>
                              <p className="text-xs text-slate-400">{batch.manufacturer}</p>
                            </td>
                            <td className="px-5 py-4 font-mono text-blue-600 text-xs">#{batch.batchId}</td>
                            <td className="px-5 py-4 text-slate-600">{new Date(batch.expiryDate).toLocaleDateString()}</td>
                            <td className="px-5 py-4">
                              {batch.currentStatus === 'SAFE' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                                  <CheckCircle className="w-3 h-3" /> Safe
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                                  <AlertTriangle className="w-3 h-3" /> Alert
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <div id={`qr-${batch.batchId}`} className="inline-block">
                                <MedicineQR id={`qrsvg-${batch.batchId}`} batchId={batch.masterTransactionId!} medicineName={batch.name} />
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <button onClick={() => printQR(batch)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors">
                                <Printer className="w-3.5 h-3.5" /> Print
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── QR Scanner ── */}
            {mode === 'scanner' && (
              <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-10">
                <div className={`w-56 h-56 border-4 border-emerald-500 rounded-3xl flex items-center justify-center mb-6 ${isScanning ? 'animate-pulse' : ''}`}>
                  <QrCode className="w-24 h-24 text-slate-200" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-1">{isScanning ? 'Scanning...' : 'Scan Medicine QR'}</h3>
                <p className="text-slate-500 mb-5 text-center max-w-sm text-sm">Enter the Master Transaction ID or Batch ID from the medicine label.</p>
                <div className="w-full max-w-sm flex flex-col gap-2 mb-4">
                  <input type="text" placeholder="Enter Master ID or Batch ID"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-slate-800 bg-slate-50 font-mono text-center text-sm"
                    value={scanInput} onChange={e => setScanInput(e.target.value)} disabled={isScanning} />
                  {scanError && <p className="text-red-500 text-sm text-center font-bold">{scanError}</p>}
                </div>
                <button id="mock-scan-btn" onClick={handleScanMock} disabled={isScanning} type="button"
                  className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
                  <ScanLine className="w-5 h-5" /> Verify & Scan
                </button>
              </motion.div>
            )}

            {/* ── Interactive Verification Timeline after scan ── */}
            {mode === 'timeline' && scannedBatch && (
              <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <VerificationTimeline
                  batch={scannedBatch}
                  onScanAnother={() => { setMode('scanner'); setScannedBatch(null); setScanInput(''); }}
                />
              </motion.div>
            )}

            {/* ── Transaction History ── */}
            {mode === 'history' && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" /> Full Transaction History
                  </h3>
                </div>

                {/* Active Alerts Panel */}
                {store.batches.some(b => b.currentStatus === 'TAMPERED' || !b.masterTransactionId) && (
                  <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Active Transaction Alerts
                    </p>
                    {store.batches.map(batch => {
                      const daysLeft = Math.ceil((new Date(batch.expiryDate).getTime() - Date.now()) / 86400000);
                      const issues: string[] = [];
                      if (batch.currentStatus === 'TAMPERED') issues.push('🔴 Data tampered or temperature breach detected');
                      if (!batch.masterTransactionId) issues.push('🟡 Supply chain incomplete — not yet delivered to end user');
                      if (daysLeft <= 30 && daysLeft > 0) issues.push(`🟠 Expiry warning: ${daysLeft} days remaining`);
                      if (daysLeft <= 0) issues.push('🔴 Batch has expired');
                      if (issues.length === 0) return null;
                      return (
                        <div key={batch.batchId} className="bg-white rounded-xl border border-amber-100 px-4 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800 text-xs">{batch.name} <span className="font-mono text-slate-400">#{batch.batchId}</span></span>
                            <button onClick={async () => {
                              const lastEv = batch.events[batch.events.length - 1];
                              await fetch(`${API_BASE}/api/incomplete-alert`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ batchId: batch.batchId, medicineName: batch.name, currentStage: lastEv.type, stagedAt: lastEv.timestamp }) });
                              alert(`Alert sent to admin for batch ${batch.batchId}`);
                            }} className="text-[9px] font-bold px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                              📧 Alert Admin
                            </button>
                          </div>
                          {issues.map((msg, i) => <p key={i} className="text-xs text-amber-800">{msg}</p>)}
                        </div>
                      );
                    })}
                  </div>
                )}

                {store.batches.length === 0 ? (
                  <p className="text-slate-400 text-center py-14 bg-slate-50 rounded-2xl border border-slate-100">No transactions yet.</p>
                ) : (
                  <div className="space-y-4">
                    {store.batches.map(batch => (
                      <div key={batch.batchId} className="rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="bg-slate-50 px-5 py-3 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800">{batch.name}</span>
                            <span className="text-xs text-slate-400 font-mono ml-3">#{batch.batchId}</span>
                          </div>
                          {batch.currentStatus === 'TAMPERED' ? (
                            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full uppercase">⚠ Tampered</span>
                          ) : batch.masterTransactionId ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase">✅ Complete</span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase">⏳ In Progress</span>
                          )}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse min-w-[640px]">
                            <thead>
                              <tr className="bg-white text-slate-400 font-bold uppercase tracking-widest border-b border-slate-100">
                                <th className="px-4 py-2">Tx Hash</th>
                                <th className="px-4 py-2">Stage</th>
                                <th className="px-4 py-2">Location</th>
                                <th className="px-4 py-2">Temp</th>
                                <th className="px-4 py-2">Certificate</th>
                                <th className="px-4 py-2">Date & Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {batch.events.map((ev, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="px-4 py-2 font-mono text-blue-500 truncate max-w-[120px]" title={ev.txId}>{ev.txId.substring(0, 18)}…</td>
                                  <td className="px-4 py-2 font-bold text-slate-700">{ev.type}</td>
                                  <td className="px-4 py-2 text-slate-600">{ev.location}</td>
                                  <td className={`px-4 py-2 font-bold ${ev.temperature < 2 || ev.temperature > 8 ? 'text-red-600' : 'text-emerald-600'}`}>{ev.temperature.toFixed(1)}°C</td>
                                  <td className="px-4 py-2">
                                    {ev.certificate
                                      ? <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 w-fit ${ev.certificate.signatureValid ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                          🔐 {ev.certificate.certId}
                                        </span>
                                      : <span className="text-slate-300">—</span>}
                                  </td>
                                  <td className="px-4 py-2 text-slate-400">{new Date(ev.timestamp).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {batch.masterTransactionId && (
                          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Transaction ID</p>
                            <p className="text-xs font-mono text-blue-600 break-all">{batch.masterTransactionId}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Record Dose Form ── */}

            {mode === 'form' && !isSubmitting && !isSuccess && (
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SecureInputField label="Patient ID (Will be hashed)" field="patientId" placeholder="National ID / Registration No" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 50 }} />
                  <SecureInputField label="Age & Gender" field="ageGender" placeholder="e.g. 45-54, Female" formData={formData} setFormData={setFormData} rules={{ maxLength: 30 }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SecureInputField label="Vaccine Name" field="vaccineName" formData={formData} setFormData={setFormData} rules={{ maxLength: 100 }} />
                  <SecureInputField label="Lot/Batch ID" field="lotId" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 30 }} />
                  <SecureInputField label="Admin Date & Time" field="adminDate" type="datetime-local" formData={formData} setFormData={setFormData} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SecureInputField label="Dose Number" field="doseNumber" placeholder="e.g. 1" type="number" formData={formData} setFormData={setFormData} rules={{ maxLength: 10 }} />
                  <SecureInputField label="Clinician ID" field="clinicianId" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 50 }} />
                  <SecureInputField label="Admin Site" field="adminSite" placeholder="e.g. Left Arm" formData={formData} setFormData={setFormData} rules={{ maxLength: 100 }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Adverse Event Flag</label>
                    <select required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-slate-800 bg-slate-50 text-sm" value={formData.adverseEvent} onChange={e => setFormData((p: any) => ({ ...p, adverseEvent: e.target.value }))}>
                      <option>No</option><option>Yes (Minor)</option><option>Yes (Severe)</option>
                    </select>
                  </div>
                  <SecureInputField label="Next Dose Due Date" field="nextDoseDate" type="date" formData={formData} setFormData={setFormData} required={false} rules={{ isDate: true }} />
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl flex items-start gap-3 border border-emerald-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-800 font-medium">Patient PII is hashed before storage. Signature hash stored securely on the backend.</p>
                </div>
                <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-colors shadow-sm text-lg">
                  Sign & Submit to Blockchain
                </button>
              </motion.form>
            )}
            {mode === 'form' && isSubmitting && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                <h3 className="text-xl font-bold text-slate-800">Signing & Writing transaction...</h3>
              </motion.div>
            )}
            {mode === 'form' && isSuccess && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20 flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Data Securely Recorded</h3>
                <p className="text-slate-500">Hash and digital signature stored in backend securely.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
