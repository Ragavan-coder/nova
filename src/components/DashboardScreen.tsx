import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Factory, Truck, Building2, User, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useBlockchainStore } from '../lib/store';

const STAGES = [
  { key: 'CREATED',       label: 'Manufactured', icon: Factory,   color: 'blue' },
  { key: 'SHIPPED',       label: 'Distributed',  icon: Truck,     color: 'emerald' },
  { key: 'DELIVERED',     label: 'Hospital',      icon: Building2, color: 'purple' },
  { key: 'ADMINISTERED',  label: 'Patient',       icon: User,      color: 'orange' },
];

const colorMap: Record<string, { dot: string; line: string; text: string }> = {
  blue:    { dot: 'bg-blue-600',    line: 'bg-blue-400',    text: 'text-blue-600' },
  emerald: { dot: 'bg-emerald-600', line: 'bg-emerald-400', text: 'text-emerald-600' },
  purple:  { dot: 'bg-purple-600',  line: 'bg-purple-400',  text: 'text-purple-600' },
  orange:  { dot: 'bg-orange-500',  line: 'bg-orange-400',  text: 'text-orange-500' },
};

const STALL_HOURS = 24; // Alert if a batch hasn't moved in this many hours

import { API_BASE } from '../lib/api';

export default function DashboardScreen({ store }: { store: ReturnType<typeof useBlockchainStore> }) {
  const { batches, stats } = store;
  const safePercent = stats.total > 0 ? ((stats.safe / stats.total) * 100).toFixed(1) : '100.0';

  // Monitor for stalled (incomplete) transactions
  useEffect(() => {
    const STALL_MS = STALL_HOURS * 60 * 60 * 1000;
    batches.forEach(batch => {
      if (batch.masterTransactionId) return; // fully complete
      const latestEvent = batch.events[batch.events.length - 1];
      const ageMs = Date.now() - latestEvent.timestamp;
      if (ageMs > STALL_MS) {
        fetch(`${API_BASE}/api/incomplete-alert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId: batch.batchId,
            medicineName: batch.name,
            currentStage: latestEvent.type,
            stagedAt: latestEvent.timestamp
          })
        }).catch(() => {});
      }
    });
  }, [batches]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col flex-1 h-full">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Admin Dashboard</h2>
          <p className="text-slate-500 mt-1">Real-time network statistics and ledger history.</p>
        </div>
        <p className="text-xs text-slate-400 font-mono">{new Date().toLocaleString()}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5">
        <div className="col-span-1 md:col-span-3 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-4xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-500 font-bold uppercase mt-2 tracking-widest">Total Batches</p>
        </div>
        <div className="col-span-1 md:col-span-3 bg-blue-600 rounded-3xl p-6 shadow-md flex flex-col justify-center items-center text-center text-white">
          <p className="text-4xl font-bold">{safePercent}%</p>
          <p className="text-xs opacity-80 font-bold uppercase mt-2 tracking-widest text-blue-100">Safe Shipments</p>
        </div>
        <div className="col-span-1 md:col-span-3 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-4xl font-bold text-emerald-600">{batches.filter(b => b.masterTransactionId).length}</p>
          <p className="text-xs text-slate-500 font-bold uppercase mt-2 tracking-widest">Fully Delivered</p>
        </div>
        <div className="col-span-1 md:col-span-3 bg-red-50 border border-red-100 rounded-3xl p-6 flex flex-col justify-center items-center text-center">
          <p className="text-4xl font-bold text-red-600">{stats.alerts}</p>
          <p className="text-xs text-red-500 font-bold uppercase mt-2 tracking-widest">Tamper Alerts</p>
        </div>
      </div>

      {/* Batch List with Supply Chain Timeline */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex-1 flex flex-col">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-blue-600" /> Batch Supply Chain Progress
        </h3>

        {batches.length === 0 ? (
          <p className="text-slate-400 text-center py-16">No batches on the ledger yet. Submit a Manufacturer form to get started.</p>
        ) : (
          <div className="space-y-6">
            {batches.map((batch) => {
              const eventTypes = batch.events.map(e => e.type);
              const latestEvent = batch.events[batch.events.length - 1];
              const isComplete = !!batch.masterTransactionId;
              const isTampered = batch.currentStatus === 'TAMPERED';

              return (
                <div key={batch.batchId} className={`rounded-2xl border p-5 ${isTampered ? 'border-red-200 bg-red-50/50' : 'border-slate-100 bg-slate-50/30'}`}>
                  {/* Batch Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-lg">{batch.name}</span>
                        {isTampered ? (
                          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Tampered
                          </span>
                        ) : isComplete ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Complete
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                            <Clock className="w-3 h-3" /> In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        ID: #{batch.batchId} &bull; Expiry: {new Date(batch.expiryDate).toLocaleDateString()} &bull; Last Updated: {new Date(latestEvent.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-400 font-mono">
                      Temp: <span className={latestEvent.temperature < 2 || latestEvent.temperature > 8 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>{latestEvent.temperature.toFixed(1)}°C</span>
                    </div>
                  </div>

                  {/* Stage Timeline */}
                  <div className="flex items-center gap-0 overflow-x-auto">
                    {STAGES.map((stage, idx) => {
                      const reached = eventTypes.includes(stage.key as any);
                      const isLast = idx === STAGES.length - 1;
                      const c = colorMap[stage.color];
                      const matchedEvent = batch.events.find(e => e.type === stage.key);

                      return (
                        <React.Fragment key={stage.key}>
                          <div className="flex flex-col items-center min-w-[80px]">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border-2 ${reached ? `${c.dot} border-white text-white` : 'bg-white border-slate-200 text-slate-300'}`}>
                              <stage.icon className="w-5 h-5" />
                            </div>
                            <p className={`text-[10px] font-bold mt-1 text-center ${reached ? c.text : 'text-slate-300'}`}>{stage.label}</p>
                            {matchedEvent && (
                              <p className="text-[9px] text-slate-400 text-center mt-0.5 leading-tight">{new Date(matchedEvent.timestamp).toLocaleDateString()}<br/>{new Date(matchedEvent.timestamp).toLocaleTimeString()}</p>
                            )}
                            {!matchedEvent && (
                              <p className="text-[9px] text-slate-300 mt-0.5">Pending</p>
                            )}
                          </div>
                          {!isLast && (
                            <div className={`flex-1 h-1 mx-1 rounded-full ${reached && eventTypes.includes(STAGES[idx + 1]?.key as any) ? c.line : 'bg-slate-100'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Transaction Log */}
                  <details className="mt-4">
                    <summary className="text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer select-none hover:text-slate-800">View Transaction Log ({batch.events.length} events)</summary>
                    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-widest">
                            <th className="px-4 py-2">Tx ID</th>
                            <th className="px-4 py-2">Stage</th>
                            <th className="px-4 py-2">Location</th>
                            <th className="px-4 py-2">Temp</th>
                            <th className="px-4 py-2">Actor</th>
                            <th className="px-4 py-2">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {batch.events.map((ev, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-mono text-blue-600 truncate max-w-[100px]" title={ev.txId}>{ev.txId.substring(0, 16)}…</td>
                              <td className="px-4 py-2 font-bold text-slate-700">{ev.type}</td>
                              <td className="px-4 py-2 text-slate-600">{ev.location}</td>
                              <td className={`px-4 py-2 font-bold ${ev.temperature < 2 || ev.temperature > 8 ? 'text-red-600' : 'text-emerald-600'}`}>{ev.temperature.toFixed(1)}°C</td>
                              <td className="px-4 py-2 text-slate-500">{ev.actor}</td>
                              <td className="px-4 py-2 text-slate-400">{new Date(ev.timestamp).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
