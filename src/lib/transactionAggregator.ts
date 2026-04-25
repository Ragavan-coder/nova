import SHA256 from 'crypto-js/sha256';
import encHex from 'crypto-js/enc-hex';

export class ProvenanceTracker {
  private transactionIds: string[] = [];

  addTransaction(txId: string) {
    this.transactionIds.push(txId);
  }

  getMasterReferenceId(): string {
    if (this.transactionIds.length === 0) return '';
    const chainedIds = this.transactionIds.join('');
    return SHA256(chainedIds).toString(encHex);
  }
  
  getHistory() {
    return [...this.transactionIds];
  }
}

// Global instance for demo purposes
export const globalTracker = new ProvenanceTracker();
