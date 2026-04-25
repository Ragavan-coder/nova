import pkg from 'elliptic';
const { ec: EC } = pkg;
import SHA256 from 'crypto-js/sha256';
import encHex from 'crypto-js/enc-hex';

const ec = new EC('p256');

export function generateKeyPair() {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate('hex');
  const publicKey = keyPair.getPublic('hex');
  
  return { privateKey, publicKey };
}

export function signPayload(privateKeyHex: string, payload: any) {
  const keyPair = ec.keyFromPrivate(privateKeyHex, 'hex');
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hash = SHA256(payloadString).toString(encHex);
  const signature = keyPair.sign(hash, 'hex');
  
  return {
    hash,
    signature: signature.toDER('hex')
  };
}

export function verifyPayload(publicKeyHex: string, payload: any, signatureHex: string): boolean {
  try {
    const key = ec.keyFromPublic(publicKeyHex, 'hex');
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hash = SHA256(payloadString).toString(encHex);
    return key.verify(hash, signatureHex);
  } catch (error) {
    return false;
  }
}
