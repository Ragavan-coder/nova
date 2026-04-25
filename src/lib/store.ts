import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { VaccineBatch, BlockchainEvent, StatusType, EventType, CertificateProof } from './types';

const STORAGE_KEY = 'nova_blockchain_ledger_v3';

// Generate a cryptographically-style Tx ID
const generateTxId = () => '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
  .map(b => b.toString(16).padStart(2, '0')).join('');

// Generate a simulated certificate for a given role
const generateCertificate = (role: string): CertificateProof => {
  const certSerial = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
  const pubKeyFingerprint = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();

  const caMap: Record<string, string> = {
    Manufacturer: 'Nova-MFG-CA',
    Distributor:  'Nova-DIST-CA',
    Hospital:     'Nova-HOSP-CA',
    Patient:      'Nova-USER-CA',
  };
  const cnMap: Record<string, string> = {
    Manufacturer: 'Manufacturer Peer CA',
    Distributor:  'Distributor Peer CA',
    Hospital:     'Hospital Approval CA',
    Patient:      'End-User Verification CA',
  };

  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);

  return {
    certId: `CERT-${role.toUpperCase().slice(0,3)}-${certSerial.substring(0, 8)}`,
    commonName: cnMap[role] || role,
    issuedBy: caMap[role] || 'Nova-CA',
    role,
    publicKey: pubKeyFingerprint,
    signatureAlgo: 'ECDSA-P256',
    validUntil: expiry.toISOString(),
    signatureValid: true,
    approvedAt: Date.now(),
  };
};

const loadFromStorage = (): VaccineBatch[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as VaccineBatch[];
  } catch {}
  return [];
};

const saveToStorage = (batches: VaccineBatch[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  } catch {}
};

export function useBlockchainStore() {
  const [batches, setBatches] = useState<VaccineBatch[]>(() => loadFromStorage());
  const failedAttemptsRef = useRef(0);
  // Listen to cross-tab storage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setBatches(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Persist every change to localStorage and push to backend
  useEffect(() => {
    saveToStorage(batches);
    // Push updates to backend
    batches.forEach(batch => {
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch)
      }).catch(err => console.error('Failed to sync batch to backend:', err));
    });
  }, [batches]);

  const addBatch = useCallback((name: string, manufacturer: string, expiryDate: string, initialTemp: number = 4.0) => {
    const newBatchId = `BCH-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const cert = generateCertificate('Manufacturer');
    const newBatch: VaccineBatch = {
      batchId: newBatchId,
      name,
      manufacturer,
      expiryDate,
      createdAt: Date.now(),
      currentStatus: (initialTemp >= 2 && initialTemp <= 8) ? 'SAFE' : 'TAMPERED',
      events: [
        {
          txId: generateTxId(),
          timestamp: Date.now(),
          type: 'CREATED',
          location: 'Origin Facility',
          temperature: initialTemp,
          actor: 'Manufacturer node',
          certificate: cert,
        }
      ]
    };

    setBatches(prev => {
      const updated = [newBatch, ...prev];
      saveToStorage(updated);
      return updated;
    });
    return newBatchId;
  }, []);

  const incrementFailedAttempts = useCallback(() => {
    failedAttemptsRef.current += 1;
    return failedAttemptsRef.current >= 3;
  }, []);

  const resetFailedAttempts = useCallback(() => {
    failedAttemptsRef.current = 0;
  }, []);

  const addEventToBatch = useCallback((batchId: string, type: EventType, location: string, temperature: number, actor: string) => {
    // Map actor → role for certificate
    const roleMap: Record<string, string> = {
      'Distributor node': 'Distributor',
      'Hospital node':    'Hospital',
      'Patient node':     'Patient',
      'Logistics node':   'Distributor',
    };
    const role = roleMap[actor] || actor;
    const cert = generateCertificate(role);

    setBatches(prev => {
      const updated = prev.map(batch => {
        if (batch.batchId !== batchId) return batch;

        let newStatus = type === 'CREATED' ? 'CREATED' : 
                         type === 'SHIPPED' ? 'SHIPPED' : 
                         type === 'DELIVERED' ? 'SAFE' : batch.currentStatus;

        if (temperature < 2 || temperature > 8) newStatus = 'TAMPERED';

        const newEvent: BlockchainEvent = {
          txId: generateTxId(),
          timestamp: Date.now(),
          type,
          location,
          temperature,
          actor,
          certificate: newStatus === 'TAMPERED' ? { ...cert, signatureValid: false } : cert,
        };

        return {
          ...batch,
          currentStatus: newStatus,
          events: [...batch.events, newEvent]
        };
      });
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const setMasterTransactionId = useCallback((batchId: string, masterId: string) => {
    setBatches(prev => {
      const updated = prev.map(batch =>
        batch.batchId === batchId ? { ...batch, masterTransactionId: masterId } : batch
      );
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const verifyBatch = useCallback((batchIdOrMasterId: string) => {
    return batches.find(b => b.batchId === batchIdOrMasterId || b.masterTransactionId === batchIdOrMasterId) || null;
  }, [batches]);

  const clearAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBatches([]);
  }, []);

  const stats = useMemo(() => ({
    total: batches.length,
    safe: batches.filter(b => b.currentStatus === 'SAFE').length,
    alerts: batches.filter(b => b.currentStatus === 'WARNING' || b.currentStatus === 'TAMPERED').length,
  }), [batches]);

  // ── Workflow helpers ─────────────────────────────────────────────────

  /** True if a batch with this exact batchId already exists */
  const batchExists = useCallback((batchId: string) =>
    batches.some(b => b.batchId === batchId)
  , [batches]);

  /** Batches a Distributor can process (CREATED, not yet SHIPPED) */
  const eligibleForDistributor = useMemo(() =>
    batches.filter(b => {
      const types = b.events.map(e => e.type);
      return types.includes('CREATED') && !types.includes('SHIPPED') && b.currentStatus !== 'TAMPERED';
    })
  , [batches]);

  /** Batches a Hospital can verify (SHIPPED, not yet DELIVERED) */
  const eligibleForHospital = useMemo(() =>
    batches.filter(b => {
      const types = b.events.map(e => e.type);
      return types.includes('SHIPPED') && !types.includes('DELIVERED');
    })
  , [batches]);

  /** Validate a workflow step – returns error string or null */
  const validateWorkflowStep = useCallback((batchId: string, requiredPrior: EventType, disallowedIfExists: EventType): string | null => {
    const batch = batches.find(b => b.batchId === batchId);
    if (!batch) return `Batch "${batchId}" not found. Manufacturer must create it first.`;
    const types = batch.events.map(e => e.type);
    if (!types.includes(requiredPrior)) return `Batch "${batchId}" has not completed the previous stage (${requiredPrior}).`;
    if (types.includes(disallowedIfExists)) return `Batch "${batchId}" has already been processed at this stage.`;
    return null;
  }, [batches]);


  return {
    batches,
    stats,
    addBatch,
    addEventToBatch,
    setMasterTransactionId,
    verifyBatch,
    clearAllData,
    batchExists,
    eligibleForDistributor,
    eligibleForHospital,
    validateWorkflowStep,
    incrementFailedAttempts,
    resetFailedAttempts
  };
}
