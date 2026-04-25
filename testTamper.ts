import { generateKeyPair, signPayload, verifyPayload } from './src/lib/cryptoUtils';

console.log("=== PROJECT NOVA TAMPER DETECTION EXAMPLE ===");

// 1. Setup Phase: Generate keys for a Manufacturer
const { privateKey, publicKey } = generateKeyPair();
console.log("\n[1] Manufacturer Keys Generated:");
console.log("    Public Key (Shared with Network):", publicKey.substring(0, 30) + "...");

// 2. Data Creation: Manufacturer logs a legitimate batch
const legitimateData = {
    batchId: "BCH-2026-X01",
    temperature: 4.2,
    location: "Origin Facility"
};

// 3. Signing Phase: Manufacturer signs the data before sending to backend
const { hash, signature } = signPayload(privateKey, legitimateData);
console.log("\n[2] Data Signed by Manufacturer:");
console.log("    Original Data:", JSON.stringify(legitimateData));
console.log("    Generated Hash:", hash);
console.log("    Signature:", signature.substring(0, 30) + "...");

// 4. Verification Phase (Normal): Verify the legitimate data
const isValidLegit = verifyPayload(publicKey, legitimateData, signature);
console.log("\n[3] Network Verifies Original Data:");
console.log("    Is Data Authentic?", isValidLegit ? "✅ YES (Safe)" : "❌ NO (Tampered)");

// 5. Tampering Phase: Malicious actor changes the data!
const tamperedData = {
    ...legitimateData,
    temperature: 15.0 // Altered to hide a temperature breach!
};

console.log("\n[4] 🚨 ALERT! Hacker changes the temperature to hide a breach...");
console.log("    Tampered Data:", JSON.stringify(tamperedData));

// 6. Verification Phase (Tampered): The network tries to verify the tampered data with the original signature
const isValidTampered = verifyPayload(publicKey, tamperedData, signature);
console.log("\n[5] Network Verifies Tampered Data:");
console.log("    Is Data Authentic?", isValidTampered ? "✅ YES (Safe)" : "❌ NO (CRYPTOGRAPHIC TAMPER ALERT!)");

if (!isValidTampered) {
    console.log("\n🚨 ACTION TAKEN: The system has detected that the data signature does not match the payload. The record is rejected and flagged for tampering.");
}
