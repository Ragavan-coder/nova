import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Factory, Truck, Building2, User, CheckCircle, XCircle,
  AlertTriangle, ShieldCheck, ShieldAlert, ChevronRight,
  MapPin, Thermometer, Clock, Hash, ArrowRight, Zap, Lock, Award, Bell
} from 'lucide-react';
import { VaccineBatch } from '../lib/types';

interface Props {
  batch: VaccineBatch;
  onScanAnother: () => void;
}

const STAGE_CONFIG = [
  {
    key: 'CREATED',
    label: 'Manufacturer',
    sublabel: 'Batch Creation',
    icon: Factory,
    color: { ring: 'ring-blue-500', bg: 'bg-blue-600', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', gradient: 'from-blue-600 to-blue-400' },
  },
  {
    key: 'SHIPPED',
    label: 'Distributor',
    sublabel: 'Cold Chain Transport',
    icon: Truck,
    color: { ring: 'ring-cyan-500', bg: 'bg-cyan-600', light: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', gradient: 'from-cyan-600 to-cyan-400' },
  },
  {
    key: 'DELIVERED',
    label: 'Hospital',
    sublabel: 'Verification & Storage',
    icon: Building2,
    color: { ring: 'ring-emerald-500', bg: 'bg-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', gradient: 'from-emerald-600 to-emerald-400' },
  },
  {
    key: 'ADMINISTERED',
    label: 'End User',
    sublabel: 'Final Administration',
    icon: User,
    color: { ring: 'ring-violet-500', bg: 'bg-violet-600', light: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', gradient: 'from-violet-600 to-violet-400' },
  },
];

export default function VerificationTimeline({ batch, onScanAnother }: Props) {
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [animStep, setAnimStep] = useState(0);

  const eventTypes = batch.events.map(e => e.type);
  const isComplete = !!batch.masterTransactionId;
  const isTampered = batch.currentStatus === 'TAMPERED';
  const daysToExpiry = Math.ceil((new Date(batch.expiryDate).getTime() - Date.now()) / 86400000);
  const isExpirySoon = daysToExpiry <= 30 && daysToExpiry > 0;
  const isExpired = daysToExpiry <= 0;

  const completedCount = STAGE_CONFIG.filter(s => eventTypes.includes(s.key as any)).length;

  // Animate stages appearing one by one
  useEffect(() => {
    const t = setTimeout(() => {
      if (animStep < completedCount) setAnimStep(prev => prev + 1);
    }, 350);
    return () => clearTimeout(t);
  }, [animStep, completedCount]);

  const getVerdict = () => {
    if (isTampered) return { label: 'Fake / Tampered Vaccine', icon: XCircle, color: 'bg-red-600', textColor: 'text-red-600', borderColor: 'border-red-200', bgLight: 'bg-red-50', emoji: '❌' };
    if (!isComplete) return { label: 'Not Fully Verified', icon: AlertTriangle, color: 'bg-amber-500', textColor: 'text-amber-600', borderColor: 'border-amber-200', bgLight: 'bg-amber-50', emoji: '⚠️' };
    return { label: 'Genuine Vaccine — Verified', icon: ShieldCheck, color: 'bg-emerald-600', textColor: 'text-emerald-700', borderColor: 'border-emerald-200', bgLight: 'bg-emerald-50', emoji: '✅' };
  };

  const verdict = getVerdict();

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* ─── Result Banner ─── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl p-5 border ${verdict.bgLight} ${verdict.borderColor} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl ${verdict.color} flex items-center justify-center shadow-lg shrink-0`}>
            <verdict.icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Blockchain Verification Result</p>
            <h2 className={`text-xl font-black ${verdict.textColor}`}>{verdict.emoji} {verdict.label}</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Batch: <span className="font-bold text-slate-700">#{batch.batchId}</span>
              &nbsp;•&nbsp; {batch.name}
              &nbsp;•&nbsp; {batch.manufacturer}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-1.5">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${isExpired ? 'bg-red-100 text-red-700' : isExpirySoon ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {isExpired ? '❌ Expired' : isExpirySoon ? `⚠️ Expires in ${daysToExpiry}d` : `✅ Valid until ${new Date(batch.expiryDate).toLocaleDateString()}`}
          </span>
          <button onClick={onScanAnother} className="text-xs font-bold text-slate-400 hover:text-slate-700 underline">← Scan Another</button>
        </div>
      </motion.div>

      {/* ─── Master Transaction ID Card ─── */}
      {batch.masterTransactionId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-slate-900 rounded-2xl px-5 py-4 flex items-center gap-4 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-emerald-600/10 pointer-events-none" />
          <div className="bg-emerald-500/20 p-2.5 rounded-xl shrink-0">
            <Hash className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Master Transaction ID (All Hashes Combined)</p>
            <p className="text-sm font-mono text-emerald-400 truncate font-bold">{batch.masterTransactionId}</p>
          </div>
          <div className="shrink-0 ml-auto">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full">
              <Zap className="w-3 h-3" /> Hyperledger Fabric
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Horizontal Timeline ─── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Supply Chain Journey — Manufacturer → Distributor → Hospital → End User</p>

        {/* Desktop horizontal timeline */}
        <div className="relative hidden md:flex items-start justify-between gap-0">
          {/* Background connector line */}
          <div className="absolute top-6 left-12 right-12 h-0.5 bg-slate-100 z-0" />

          {STAGE_CONFIG.map((stage, idx) => {
            const reached = animStep > idx;
            const event = batch.events.find(e => e.type === stage.key as any);
            const isAnomaly = event && (event.temperature < 2 || event.temperature > 8);
            const c = stage.color;

            return (
              <React.Fragment key={stage.key}>
                <motion.div
                  className="flex flex-col items-center z-10 cursor-pointer group"
                  style={{ width: '23%' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={reached ? { opacity: 1, y: 0 } : { opacity: 0.35, y: 0 }}
                  transition={{ delay: idx * 0.2 + 0.3 }}
                  onClick={() => setActiveStage(activeStage === idx ? null : idx)}
                >
                  {/* Icon Circle */}
                  <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center shadow-md transition-all group-hover:scale-110 ${
                    reached
                      ? isAnomaly
                        ? 'bg-red-500 border-red-200 text-white'
                        : `bg-gradient-to-br ${c.gradient} border-white text-white`
                      : 'bg-slate-100 border-slate-50 text-slate-300'
                  }`}>
                    <stage.icon className="w-5 h-5" />
                  </div>

                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full mt-2 ${reached ? (isAnomaly ? 'bg-red-500 animate-pulse' : 'bg-emerald-500') : 'bg-slate-200'}`} />

                  {/* Label */}
                  <p className={`text-sm font-black mt-1.5 text-center ${reached ? 'text-slate-800' : 'text-slate-300'}`}>{stage.label}</p>
                  <p className={`text-[9px] uppercase tracking-widest font-bold mt-0.5 text-center ${reached ? c.text : 'text-slate-300'}`}>{stage.sublabel}</p>

                  {/* Timestamp */}
                  {event && reached && (
                    <p className="text-[9px] text-slate-400 mt-1 text-center font-mono leading-tight">
                      {new Date(event.timestamp).toLocaleDateString()}<br />
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                  {!event && (
                    <p className="text-[9px] text-slate-300 mt-1 text-center">Pending</p>
                  )}

                  {/* Verified badge */}
                  {reached && !isAnomaly && (
                    <span className="mt-2 text-[9px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" /> Verified
                    </span>
                  )}
                  {reached && isAnomaly && (
                    <span className="mt-2 text-[9px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> Breach
                    </span>
                  )}
                  {!reached && (
                    <span className="mt-2 text-[9px] bg-slate-100 text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase">Not yet</span>
                  )}
                </motion.div>

                {/* Arrow between stages */}
                {idx < STAGE_CONFIG.length - 1 && (
                  <div className="z-10 flex items-start pt-5">
                    <ArrowRight className={`w-5 h-5 ${animStep > idx ? 'text-blue-400' : 'text-slate-200'}`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile vertical timeline */}
        <div className="relative pl-8 border-l-2 border-slate-100 space-y-6 md:hidden">
          {STAGE_CONFIG.map((stage, idx) => {
            const reached = animStep > idx;
            const event = batch.events.find(e => e.type === stage.key as any);
            const isAnomaly = event && (event.temperature < 2 || event.temperature > 8);
            const c = stage.color;
            return (
              <motion.div key={stage.key} initial={{ opacity: 0, x: -10 }} animate={reached ? { opacity: 1, x: 0 } : { opacity: 0.35, x: 0 }}
                transition={{ delay: idx * 0.2 + 0.3 }} className="relative">
                <div className={`absolute -left-[41px] top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow ${reached ? `bg-gradient-to-br ${c.gradient} text-white` : 'bg-slate-100 text-slate-300'}`}>
                  <stage.icon className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between">
                  <p className={`font-bold text-sm ${reached ? 'text-slate-800' : 'text-slate-300'}`}>{stage.label}</p>
                  {reached && !isAnomaly && <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">✅ Verified</span>}
                  {reached && isAnomaly && <span className="text-[9px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">⚠ Breach</span>}
                  {!reached && <span className="text-[9px] bg-slate-100 text-slate-400 font-bold px-2 py-0.5 rounded-full">Pending</span>}
                </div>
                {event && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(event.timestamp).toLocaleString()}</p>}
              </motion.div>
            );
          })}
        </div>

        {/* Expandable Stage Details Panel */}
        <AnimatePresence>
          {activeStage !== null && (() => {
            const stage = STAGE_CONFIG[activeStage];
            const event = batch.events.find(e => e.type === stage.key as any);
            const c = stage.color;
            if (!event) return null;
            const isAnomaly = event.temperature < 2 || event.temperature > 8;
            return (
              <motion.div key="detail" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-6">
                <div className={`rounded-2xl border ${c.light} ${c.border} p-5`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`${c.bg} p-2.5 rounded-xl`}><stage.icon className="w-5 h-5 text-white" /></div>
                    <div>
                      <h4 className="font-bold text-slate-800">{stage.label} — Stage Details</h4>
                      <p className={`text-xs font-bold ${c.text}`}>{stage.sublabel}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Tx Hash</p>
                      <p className="text-xs font-mono text-blue-600 break-all">{event.txId.substring(0, 24)}…</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                      <p className="text-sm font-bold text-slate-800">{event.location}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-1 flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temperature</p>
                      <p className={`text-sm font-bold ${isAnomaly ? 'text-red-600' : 'text-emerald-600'}`}>{event.temperature.toFixed(1)}°C {isAnomaly ? '⚠ Breach' : '✓ Safe'}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Timestamp</p>
                      <p className="text-xs font-mono text-slate-700">{new Date(event.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actor:</p>
                    <p className="text-xs font-bold text-slate-700">{event.actor}</p>
                    <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${isAnomaly ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isAnomaly ? '❌ Integrity Compromised' : '✅ Integrity Verified'}
                    </span>
                  </div>

                  {/* Certificate Panel */}
                  {event.certificate && (
                    <div className="mt-4 bg-slate-900 rounded-xl p-4 border border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Award className="w-4 h-4 text-amber-400" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Digital Certificate — Hyperledger Fabric CA</p>
                        {event.certificate.signatureValid
                          ? <span className="ml-auto text-[9px] bg-emerald-900/60 text-emerald-400 border border-emerald-700/50 font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Signature Valid</span>
                          : <span className="ml-auto text-[9px] bg-red-900/60 text-red-400 border border-red-700/50 font-bold px-2 py-0.5 rounded-full">⚠ Invalid</span>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px]">
                        <div><p className="text-slate-500 uppercase tracking-widest mb-0.5">Cert ID</p><p className="text-white font-mono">{event.certificate.certId}</p></div>
                        <div><p className="text-slate-500 uppercase tracking-widest mb-0.5">Issued By</p><p className="text-white font-bold">{event.certificate.issuedBy}</p></div>
                        <div><p className="text-slate-500 uppercase tracking-widest mb-0.5">Common Name</p><p className="text-slate-300">{event.certificate.commonName}</p></div>
                        <div><p className="text-slate-500 uppercase tracking-widest mb-0.5">Algorithm</p><p className="text-emerald-400 font-bold">{event.certificate.signatureAlgo}</p></div>
                        <div><p className="text-slate-500 uppercase tracking-widest mb-0.5">Public Key</p><p className="text-blue-400 font-mono truncate">{event.certificate.publicKey.substring(0,23)}…</p></div>
                        <div><p className="text-slate-500 uppercase tracking-widest mb-0.5">Valid Until</p><p className="text-slate-300">{new Date(event.certificate.validUntil).toLocaleDateString()}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        <p className="text-[10px] text-slate-300 text-center mt-4 font-mono">Click any stage icon for details</p>
      </div>

      {/* ─── Compact Event Log Table ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Blockchain Transaction Log
          </h4>
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{batch.events.length} Events On-Chain</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="text-slate-500 font-bold uppercase tracking-widest text-[9px] border-b border-slate-800">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Tx Hash</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Temp</th>
                <th className="px-5 py-3">Certificate</th>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {batch.events.map((ev, i) => {
                const isAnomaly = ev.temperature < 2 || ev.temperature > 8;
                return (
                  <motion.tr key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 + 0.5 }}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors`}>
                    <td className="px-5 py-3 text-slate-600 font-bold">{String(i + 1).padStart(2, '0')}</td>
                    <td className="px-5 py-3 font-mono text-blue-400 truncate max-w-[140px]" title={ev.txId}>{ev.txId.substring(0, 20)}…</td>
                    <td className="px-5 py-3">
                      <span className="font-bold text-white">{ev.type}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{ev.location}</td>
                    <td className={`px-5 py-3 font-bold ${isAnomaly ? 'text-red-400' : 'text-emerald-400'}`}>{ev.temperature.toFixed(1)}°C</td>
                    <td className="px-5 py-3">
                      {ev.certificate
                        ? <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${ev.certificate.signatureValid ? 'bg-amber-900/40 text-amber-400 border border-amber-700/40' : 'bg-red-900/40 text-red-400 border border-red-700/40'}`}>
                            <Award className="w-2.5 h-2.5" />{ev.certificate.certId}
                          </span>
                        : <span className="text-slate-600 text-[9px]">—</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500 font-mono">{new Date(ev.timestamp).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      {isAnomaly ? (
                        <span className="text-[9px] bg-red-900/50 text-red-400 border border-red-800/50 font-bold px-2 py-0.5 rounded-full uppercase">⚠ Breach</span>
                      ) : (
                        <span className="text-[9px] bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 font-bold px-2 py-0.5 rounded-full uppercase">✓ Valid</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {batch.masterTransactionId && (
          <div className="px-5 py-3 bg-slate-950/50 border-t border-slate-800 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Master Transaction ID (SHA-256 of all hashes)</p>
              <p className="text-xs font-mono text-emerald-400 break-all">{batch.masterTransactionId}</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
