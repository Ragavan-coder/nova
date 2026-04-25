export type EventType = 'CREATED' | 'SHIPPED' | 'TRANSIT' | 'DELIVERED' | 'ADMINISTERED';
export type StatusType = 'SAFE' | 'WARNING' | 'TAMPERED';

export interface CertificateProof {
  certId: string;          // Unique certificate ID issued by CA
  commonName: string;      // e.g. "Serum Institute CA"
  issuedBy: string;        // CA name
  role: string;            // Manufacturer | Distributor | Hospital | Patient
  publicKey: string;       // truncated public key fingerprint
  signatureAlgo: 'ECDSA-P256';
  validUntil: string;      // ISO date
  signatureValid: boolean;
  approvedAt: number;      // Unix ms timestamp
}

export interface BlockchainEvent {
  txId: string;
  timestamp: number;
  type: EventType;
  location: string;
  temperature: number;
  actor: string;
  certificate?: CertificateProof;  // Digital cert attached to this event
}

export interface VaccineBatch {
  batchId: string;
  name: string;
  manufacturer: string;
  expiryDate: string;
  events: BlockchainEvent[];
  currentStatus: StatusType;
  createdAt: number;
  masterTransactionId?: string;
}
