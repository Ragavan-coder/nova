import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, X, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface TermsModalProps {
  onAccept: () => void;
}

export default function TermsModal({ onAccept }: TermsModalProps) {
  const [checked, setChecked] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checked) {
      setAttempted(true);
      return;
    }
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-blue-900/30 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[25%] h-[25%] bg-emerald-900/20 blur-[80px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 200 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden relative z-10"
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-400" />

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-slate-800 flex items-center gap-4">
          <div className="bg-blue-500/10 p-3 rounded-2xl shrink-0">
            <FileText className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Terms & Conditions</h2>
            <p className="text-slate-400 text-sm mt-0.5">PROJECT<span className="text-blue-400">NOVA</span> — Blockchain Vaccine Traceability System</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-3 h-3" /> Secured Portal
          </div>
        </div>

        {/* Terms Content */}
        <div className="px-8 py-5 max-h-[45vh] overflow-y-auto space-y-5 text-sm text-slate-300 scrollbar-thin">

          <div>
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">1. Acceptance of Terms</h3>
            <p className="leading-relaxed text-slate-400">By accessing and using the Project NOVA Blockchain Vaccine Traceability System ("the System"), you agree to be bound by these Terms and Conditions. If you do not agree, you must not use this platform.</p>
          </div>

          <div>
            <h3 className="text-white font-bold mb-2">2. Authorized Use</h3>
            <p className="leading-relaxed text-slate-400">Access is strictly limited to registered personnel with valid roles: Manufacturer, Distributor, Hospital, or End User (Patient). Unauthorized access, data manipulation, or impersonation is strictly prohibited and may result in criminal liability.</p>
          </div>

          <div>
            <h3 className="text-white font-bold mb-2">3. Blockchain Data Integrity</h3>
            <p className="leading-relaxed text-slate-400">All transactions submitted through this system are cryptographically signed using ECDSA (P-256) and hashed via SHA-256. Any attempt to tamper with, forge, or misrepresent blockchain records is a violation of applicable law and these terms. Tamper events are automatically detected and reported to system administrators.</p>
          </div>

          <div>
            <h3 className="text-white font-bold mb-2">4. Privacy & Data Protection</h3>
            <p className="leading-relaxed text-slate-400">Patient identifiable information (PII) is anonymized using SHA-256 hashing before storage. No raw PII is stored on the blockchain ledger. Usage data and transaction logs are retained for regulatory compliance and audit purposes.</p>
          </div>

          <div>
            <h3 className="text-white font-bold mb-2">5. Role-Based Responsibilities</h3>
            <p className="leading-relaxed text-slate-400">Each role carries specific obligations: Manufacturers are responsible for accurate batch data. Distributors must maintain cold chain integrity. Hospitals must verify provenance before administration. End users must not share their QR verification codes.</p>
          </div>

          <div>
            <h3 className="text-white font-bold mb-2">6. Liability Disclaimer</h3>
            <p className="leading-relaxed text-slate-400">Project NOVA provides this system as-is. We are not liable for any medical decisions made based on system data. Always consult qualified medical professionals. Blockchain records are immutable — submission errors cannot be reversed.</p>
          </div>

          <div>
            <h3 className="text-white font-bold mb-2">7. Regulatory Compliance</h3>
            <p className="leading-relaxed text-slate-400">This system operates in accordance with CDSCO, WHO GMP, and applicable pharmaceutical supply chain regulations. All users must comply with local, national, and international pharmaceutical laws.</p>
          </div>

          <div>
            <h3 className="text-white font-bold mb-2">8. Changes to Terms</h3>
            <p className="leading-relaxed text-slate-400">Project NOVA reserves the right to modify these terms at any time. Continued use of the system after changes constitutes acceptance of the revised terms. Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
          </div>

        </div>

        {/* Footer / Acceptance */}
        <form onSubmit={handleSubmit} className="px-8 py-6 border-t border-slate-800 bg-slate-950/50">
          <label className={`flex items-start gap-3 cursor-pointer group mb-5 p-4 rounded-2xl border transition-colors ${checked ? 'border-emerald-500/40 bg-emerald-500/5' : attempted ? 'border-red-500/40 bg-red-500/5' : 'border-slate-700 hover:border-slate-600'}`}>
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={e => { setChecked(e.target.checked); setAttempted(false); }}
              />
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${checked ? 'bg-emerald-500 border-emerald-500' : attempted ? 'border-red-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                {checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
            <span className="text-sm text-slate-300 leading-relaxed">
              I have read, understood, and agree to the <span className="text-blue-400 font-bold">Terms & Conditions</span> and{' '}
              <span className="text-blue-400 font-bold">Privacy Policy</span> of Project NOVA. I confirm that I am an authorized user and will not misuse or tamper with the blockchain records.
            </span>
          </label>

          <AnimatePresence>
            {attempted && !checked && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-xs font-bold flex items-center gap-2 mb-4"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> You must accept the Terms & Conditions to continue.
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            className={`w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-3 shadow-lg ${
              checked
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 hover:shadow-blue-900/60'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            {checked ? 'I Accept — Enter Project NOVA' : 'Accept Terms to Continue'}
          </button>

          <p className="text-center text-[10px] text-slate-600 mt-3 font-mono uppercase tracking-widest">
            ECDSA Signed · SHA-256 Verified · Hyperledger Fabric Network
          </p>
        </form>
      </motion.div>
    </div>
  );
}
