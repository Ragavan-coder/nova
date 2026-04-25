import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Building2, ShieldCheck } from 'lucide-react';
import { SecureInputField } from '../SecureInputField';
import { validateForm, HOSPITAL_SCHEMA } from '../../lib/validation';
import { useBlockchainStore } from '../../lib/store';
import { generateKeyPair, signPayload } from '../../lib/cryptoUtils';
import { API_BASE } from '../../lib/api';

export default function HospitalForm({ store, onSuccess }: { store: ReturnType<typeof useBlockchainStore>, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    facilityName: '', registrationNo: '', type: '', location: '',
    lotId: '', receiptDate: '', storageUnitId: '',
    currentTemp: '', clinicianId: '', dosesUsed: '', wastageLog: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);
  const [masterId, setMasterId] = useState('');
  const [workflowError, setWorkflowError] = useState('');

  const eligible = store.eligibleForHospital;

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
              medicineName: 'Unknown Medicine',
              reason: 'Multiple failed validation/workflow attempts detected.',
              location: 'Hospital Portal'
            })
          });
        } catch (err) {}
      }
    };

    // ── Schema validation ──────────────────────────────────
    const { valid: sv, errors: se } = validateForm(formData as any, HOSPITAL_SCHEMA);
    if (!sv) { await handleFailure(`⛔ ${se[0].message}`); return; }

    // ── Strict Rule: Validate workflow order ─────────────────
    const err = store.validateWorkflowStep(formData.lotId, 'SHIPPED', 'DELIVERED');
    if (err) { await handleFailure(`⛔ ${err}`); return; }

    setIsSubmitting(true);
    try {
      const { privateKey } = generateKeyPair();
      const payload = { ...formData, role: 'Hospital' };
      const { signature, hash } = signPayload(privateKey, payload);

      await fetch(`${API_BASE}/api/hash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Hospital', batchId: formData.lotId, hash, signature })
      });

      const temp = parseFloat(formData.currentTemp) || 4.0;
      store.addEventToBatch(formData.lotId, 'DELIVERED', formData.location, temp, 'Hospital node');
      
      if (temp < 2 || temp > 8) {
        try {
          await fetch(`${API_BASE}/api/tamper-alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              batchId: formData.lotId,
              medicineName: 'Unknown (Check Blockchain)',
              reason: `Temperature breach detected: ${temp}°C is outside the safe 2-8°C range.`,
              location: formData.location || 'Hospital Portal'
            })
          });
        } catch (e) {}
      }
      // Generate Master Transaction ID
      try {
        const res = await fetch(`${API_BASE}/api/master-hash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId: formData.lotId })
        });
        const data = await res.json();
        if (data.success && data.masterTransactionId) {
          setMasterId(data.masterTransactionId);
          store.setMasterTransactionId(formData.lotId, data.masterTransactionId);
        }
      } catch (err) {
        console.error('Failed to generate master hash', err);
      }

      setIsSubmitting(false);
      setIsSuccess(true);
      // Wait longer so they can see/print the QR code
      // setTimeout(() => onSuccess(), 10000); // Removed auto-redirect so they can scan the QR
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  
  return (
    <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-2xl"><Building2 className="w-6 h-6 text-blue-600" /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Accept Facility Delivery</h2>
            <p className="text-slate-500 text-sm">Record receipt of vaccine batches at the health centre.</p>
          </div>
        </div>
        
        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {!isSubmitting && !isSuccess ? (
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-6">

                {/* Eligible Batches Panel */}
                <div className={`p-4 rounded-2xl border ${eligible.length > 0 ? 'bg-purple-50 border-purple-200' : 'bg-amber-50 border-amber-200'}`}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2">
                    {eligible.length > 0 ? <span className="text-purple-700">✅ Batches Awaiting Hospital Verification ({eligible.length})</span> : <span className="text-amber-700">⏳ No batches ready — Distributor must ship a batch first</span>}
                  </p>
                  {eligible.map(b => (
                    <button key={b.batchId} type="button" onClick={() => setFormData(p => ({...p, lotId: b.batchId}))}
                      className={`mr-2 mb-1 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border transition-colors ${formData.lotId === b.batchId ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-300 hover:border-purple-500'}`}>
                      {b.batchId} — {b.name}
                    </button>
                  ))}
                </div>

                {/* Workflow error */}
                {workflowError && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                    <p className="text-sm font-bold text-red-700">{workflowError}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SecureInputField label="Facility Name" field="facilityName" formData={formData} setFormData={setFormData} rules={{ maxLength: 100 }} />
                  <SecureInputField label="Registration Number" field="registrationNo" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 50 }} />
                  <SecureInputField label="Facility Type" field="type" formData={formData} setFormData={setFormData} rules={{ maxLength: 60 }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SecureInputField label="Location/Address" field="location" formData={formData} setFormData={setFormData} rules={{ maxLength: 100 }} />
                  <SecureInputField label="Lot/Batch ID Received" field="lotId" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 30 }} />
                  <SecureInputField label="Receipt Date &amp; Time" field="receiptDate" type="datetime-local" formData={formData} setFormData={setFormData} required={false} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SecureInputField label="Storage Unit ID" field="storageUnitId" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 50 }} />
                  <SecureInputField label="Current Storage Temp (°C)" field="currentTemp" type="number" formData={formData} setFormData={setFormData} rules={{ maxLength: 10 }} />
                  <SecureInputField label="Clinician/Pharmacist ID" field="clinicianId" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 50 }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SecureInputField label="Doses Administered" field="dosesUsed" type="number" formData={formData} setFormData={setFormData} required={false} rules={{ maxLength: 10 }} />
                  <SecureInputField label="Wastage Log" field="wastageLog" formData={formData} setFormData={setFormData} required={false} rules={{ maxLength: 200 }} />
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3 mt-4 border border-blue-100">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-800 font-medium">Digital signature on receipt will be securely stored to the backend JSON.</p>
                </div>

                <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-colors shadow-sm text-lg mt-4">
                  Sign & Submit to Blockchain
                </button>
              </motion.form>
            ) : isSubmitting ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <h3 className="text-xl font-bold text-slate-800">Signing & Writing transaction...</h3>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">✅ Hospital Verified — Process Completed</h3>
                <p className="text-slate-500 text-sm max-w-sm">Master Transaction ID generated and stored. Full supply chain journey is complete.</p>

                {/* Workflow Complete Banner */}
                <div className="mt-2 w-full max-w-md bg-emerald-50 border border-emerald-300 rounded-2xl p-5">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
                    <span>🏁</span> Supply Chain Complete
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs font-bold">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">🏭 Manufacturer</span>
                    <span className="text-slate-400">→</span>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">🚛 Distributor</span>
                    <span className="text-slate-400">→</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg">🏥 Hospital ✓</span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-3 font-medium">QR code is now available in <strong>End User / Patient Portal → Medicine Directory</strong></p>
                </div>

                <button onClick={onSuccess} className="mt-4 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Back to Dashboard</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
