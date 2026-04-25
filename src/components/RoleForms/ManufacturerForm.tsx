import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Factory, ShieldCheck } from 'lucide-react';
import { useBlockchainStore } from '../../lib/store';
import { generateKeyPair, signPayload } from '../../lib/cryptoUtils';
import { SecureInputField } from '../SecureInputField';
import { validateForm, MANUFACTURER_SCHEMA, sanitize } from '../../lib/validation';
import { API_BASE } from '../../lib/api';

export default function ManufacturerForm({ store, onSuccess }: { store: ReturnType<typeof useBlockchainStore>, onSuccess: (batchId: string) => void }) {
  const [formData, setFormData] = useState({
    companyName: '', licenseNumber: '', gmpCertId: '', location: '',
    vaccineName: '', type: '', formulation: '',
    batchNumber: '', mfgDate: '', expDate: '',
    doseCount: '', tempMin: '', tempMax: '', qrAssigned: '', cdscoWho: '', batchCert: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [workflowError, setWorkflowError] = useState('');
  const [createdBatchId, setCreatedBatchId] = useState('');

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
              batchId: formData.batchNumber || 'UNKNOWN_BATCH',
              medicineName: formData.vaccineName || 'Unknown Medicine',
              reason: 'Multiple failed validation/workflow attempts detected.',
              location: 'Manufacturer Portal'
            })
          });
        } catch (err) {}
      }
    };

    // ── Full schema validation ────────────────────────────
    const { valid, errors } = validateForm(formData as any, MANUFACTURER_SCHEMA);
    if (!valid) {
      await handleFailure(`⛔ ${errors[0].message}`);
      return;
    }

    // ── Strict Rule: No duplicate batch numbers ─────────────
    if (store.batchExists(formData.batchNumber)) {
      setWorkflowError(`⛔ Batch ID "${formData.batchNumber}" already exists on the blockchain. Duplicate entries are not allowed.`);
      if (store.incrementWorkflowViolation()) {
        store.resetWorkflowViolation();
        setWorkflowError("🚨 TAMPER ALERT: Duplicate batch injection attempt detected! Security notified.");
        try {
          await fetch(`${API_BASE}/api/tamper-alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              batchId: formData.batchNumber,
              medicineName: formData.vaccineName || 'Unknown Medicine',
              reason: `Manufacturer attempted to create duplicate batch "${formData.batchNumber}" that already exists on the blockchain. Possible counterfeit injection attempt.`,
              location: 'Manufacturer Portal'
            })
          });
        } catch (e) {}
      }
      return;
    }
    if (!formData.batchNumber.trim()) {
      await handleFailure('⛔ Batch Number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { privateKey } = generateKeyPair();
      const payload = { ...formData, role: 'Manufacturer' };
      const { signature, hash } = signPayload(privateKey, payload);

      await fetch(`${API_BASE}/api/hash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Manufacturer', batchId: formData.batchNumber, hash, signature })
      });

      const newId = store.addBatch(formData.vaccineName, formData.companyName, formData.expDate, parseFloat(formData.tempMin) || 4.0);
      setCreatedBatchId(newId);
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
          <div className="bg-blue-100 p-3 rounded-2xl"><Factory className="w-6 h-6 text-blue-600" /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Mint New Vaccine Batch</h2>
            <p className="text-slate-500 text-sm">Manufacturer details for the immutable ledger.</p>
          </div>
        </div>
        
        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {!isSubmitting && !isSuccess ? (
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-6">

                {/* Workflow error */}
                {workflowError && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                    <span className="text-red-600 text-lg shrink-0">⛔</span>
                    <p className="text-sm font-bold text-red-700">{workflowError}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SecureInputField label="Company Name" field="companyName" formData={formData} setFormData={setFormData} rules={{ maxLength: 100 }} />
                  <SecureInputField label="License Number" field="licenseNumber" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 50 }} />
                  <SecureInputField label="GMP Cert ID" field="gmpCertId" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 50 }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SecureInputField label="Plant Location" field="location" formData={formData} setFormData={setFormData} rules={{ maxLength: 100 }} />
                  <SecureInputField label="Vaccine Name" field="vaccineName" formData={formData} setFormData={setFormData} rules={{ maxLength: 100 }} />
                  <SecureInputField label="Vaccine Type" field="type" formData={formData} setFormData={setFormData} rules={{ maxLength: 60 }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <SecureInputField label="Formulation" field="formulation" formData={formData} setFormData={setFormData} rules={{ maxLength: 60 }} />
                  <SecureInputField label="Lot/Batch No." field="batchNumber" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, minLength: 2, maxLength: 30 }} />
                  <SecureInputField label="Mfg Date" field="mfgDate" type="date" formData={formData} setFormData={setFormData} rules={{ isDate: true }} />
                  <SecureInputField label="Expiry Date" field="expDate" type="date" formData={formData} setFormData={setFormData} rules={{ isDate: true, isFutureDate: true }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <SecureInputField label="Dose Count" field="doseCount" type="number" formData={formData} setFormData={setFormData} rules={{ maxLength: 10 }} />
                  <SecureInputField label="Min Temp (°C)" field="tempMin" type="number" formData={formData} setFormData={setFormData} rules={{ maxLength: 10 }} />
                  <SecureInputField label="Max Temp (°C)" field="tempMax" type="number" formData={formData} setFormData={setFormData} rules={{ maxLength: 10 }} />
                  <SecureInputField label="QR/Serial Assigned" field="qrAssigned" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 50 }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SecureInputField label="Regulatory Approvals (CDSCO/WHO)" field="cdscoWho" formData={formData} setFormData={setFormData} rules={{ maxLength: 100 }} />
                  <SecureInputField label="Batch Release Certificate ID" field="batchCert" formData={formData} setFormData={setFormData} rules={{ alphanumeric: true, maxLength: 50 }} />
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3 mt-4 border border-blue-100">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-800 font-medium">Digital Signature will be generated and hash stored securely on the backend.</p>
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
                <h3 className="text-2xl font-bold text-slate-800">✅ Manufacturer Completed</h3>
                <p className="text-slate-500 text-sm">Hash and digital signature stored securely on the blockchain.</p>
                {/* Next Step Notification */}
                <div className="mt-4 w-full max-w-sm bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0">→</div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-blue-800 uppercase tracking-widest">Next Step</p>
                    <p className="text-sm font-bold text-blue-700">Distributor must now process batch <span className="font-mono">{createdBatchId}</span></p>
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
