import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Truck, ShieldCheck } from 'lucide-react';
import { SecureInputField } from '../SecureInputField';
import { validateForm, DISTRIBUTOR_SCHEMA } from '../../lib/validation';
import { useBlockchainStore } from '../../lib/store';
import { generateKeyPair, signPayload } from '../../lib/cryptoUtils';
import { API_BASE } from '../../lib/api';

export default function DistributorForm({ store, onSuccess }: { store: ReturnType<typeof useBlockchainStore>, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    distributorName: '', licenseNumber: '', gstId: '', location: '',
    lotId: '', receiptDate: '', vehicleId: '',
    sensorId: '', tempEvents: '', handoffDestination: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);
  const [workflowError, setWorkflowError] = useState('');

  // Only show batches that are ready for distributor
  const eligible = store.eligibleForDistributor;

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
              location: 'Distributor Portal'
            })
          });
        } catch (err) {}
      }
    };

    // ── Schema validation ──────────────────────────────────
    const { valid: sv, errors: se } = validateForm(formData as any, DISTRIBUTOR_SCHEMA);
    if (!sv) { handleFailure(`⛔ ${se[0].message}`); return; }

    // ── Strict Rule: Validate workflow order ─────────────────
    const err = store.validateWorkflowStep(formData.lotId, 'CREATED', 'SHIPPED');
    if (err) { handleFailure(`⛔ ${err}`); return; }

    setIsSubmitting(true);
    try {
      const { privateKey } = generateKeyPair();
      const payload = { ...formData, role: 'Distributor' };
      const { signature, hash } = signPayload(privateKey, payload);

      await fetch(`${API_BASE}/api/hash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Distributor', batchId: formData.lotId, hash, signature })
      });

      store.addEventToBatch(formData.lotId, 'SHIPPED', formData.location, 4.5, 'Distributor node');

      setIsSubmitting(false);
      setIsSuccess(true);
      // Removed auto-redirect so it stays on the page until logout
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };


  
  return (
    <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="bg-emerald-100 p-3 rounded-2xl"><Truck className="w-6 h-6 text-emerald-600" /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Log Logistics & Transit</h2>
            <p className="text-slate-500 text-sm">Distributor handoff and cold chain tracking.</p>
          </div>
        </div>
        
        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {!isSubmitting && !isSuccess ? (
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-6">

                {/* Eligible Batches Panel */}
                <div className={`p-4 rounded-2xl border ${eligible.length > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    {eligible.length > 0 ? <span className="text-emerald-700">✅ Batches Ready for Distribution ({eligible.length})</span> : <span className="text-amber-700">⏳ No batches ready — Manufacturer must complete a batch first</span>}
                  </p>
                  {eligible.map(b => (
                    <button key={b.batchId} type="button" onClick={() => setFormData(p => ({...p, lotId: b.batchId}))}
                      className={`mr-2 mb-1 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border transition-colors ${ formData.lotId === b.batchId ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-300 hover:border-emerald-500'}`}>
                      {b.batchId} — {b.name}
                    </button>
                  ))}
                </div>

                {/* Workflow error */}
                {workflowError && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                    <p className="text-sm font-bold text-red-700">{workflowError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SecureInputField label="Distributor Name" field="distributorName" formData={formData} setFormData={setFormData} rules={{ maxLength: 100 }} />
                  <SecureInputField label="License Number" field="licenseNumber" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 50 }} />
                  <SecureInputField label="GST/Tax ID" field="gstId" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 30 }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SecureInputField label="Depot/Warehouse Location" field="location" formData={formData} setFormData={setFormData} rules={{ maxLength: 100 }} />
                  <SecureInputField label="Lot/Batch ID Received" field="lotId" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 30 }} />
                  <SecureInputField label="Receipt Date &amp; Time" field="receiptDate" type="datetime-local" formData={formData} setFormData={setFormData} required={false} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SecureInputField label="Vehicle/Transport ID" field="vehicleId" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 50 }} />
                  <SecureInputField label="Cold Chain Sensor ID" field="sensorId" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 50 }} />
                  <SecureInputField label="Excursion Events (if any)" field="tempEvents" placeholder="e.g. None" formData={formData} setFormData={setFormData} required={false} rules={{ maxLength: 100 }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <SecureInputField label="Handoff Destination (Next Custody)" field="handoffDestination" formData={formData} setFormData={setFormData} rules={{ maxLength: 100 }} />
                </div>

                <div className="bg-emerald-50 p-4 rounded-2xl flex items-start gap-3 mt-4 border border-emerald-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-800 font-medium">Transfer timestamp and digital signature will be captured and stored in backend.</p>
                </div>

                <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-colors shadow-sm text-lg mt-4">
                  Sign & Submit to Blockchain
                </button>
              </motion.form>
            ) : isSubmitting ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <h3 className="text-xl font-bold text-slate-800">Signing & Writing transaction...</h3>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">✅ Distributor Completed</h3>
                <p className="text-slate-500 text-sm">Hash and digital signature stored securely on the blockchain.</p>
                <div className="mt-4 w-full max-w-sm bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0">→</div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-purple-800 uppercase tracking-widest">Next Step</p>
                    <p className="text-sm font-bold text-purple-700">Hospital must now verify batch <span className="font-mono">{formData.lotId}</span></p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
