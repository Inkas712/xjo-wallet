import { PaymentRequestData, NFCPayload } from '@/types/payment';

const ENCRYPTION_KEY = 'XJO_SECURE_KEY_2024';

export function generateSecureToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}-${random2}`;
}

export function generatePaymentCode(): string {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function simpleEncrypt(data: string): string {
  let encrypted = '';
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    encrypted += String.fromCharCode(charCode);
  }
  return Buffer.from(encrypted).toString('base64');
}

export function simpleDecrypt(encryptedData: string): string {
  try {
    const data = Buffer.from(encryptedData, 'base64').toString();
    let decrypted = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      decrypted += String.fromCharCode(charCode);
    }
    return decrypted;
  } catch {
    return '';
  }
}

export function generateSignature(data: object): string {
  const jsonString = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function verifySignature(data: object, signature: string): boolean {
  return generateSignature(data) === signature;
}

export function createPaymentRequest(
  senderId: string,
  senderName: string,
  amount: number,
  currency: string,
  method: 'nfc' | 'ble' | 'code',
  note?: string
): PaymentRequestData {
  const timestamp = Date.now();
  const expiresAt = timestamp + 10 * 60 * 1000; // 10 minutes
  
  const baseData = {
    senderId,
    senderName,
    amount,
    currency,
    timestamp,
    method,
  };
  
  const token = generateSecureToken();
  const encryptedToken = simpleEncrypt(JSON.stringify({ token, ...baseData }));
  const signature = generateSignature(baseData);
  
  return {
    id: `pay_${timestamp}_${Math.random().toString(36).substring(2, 9)}`,
    senderId,
    senderName,
    amount,
    currency,
    note,
    timestamp,
    expiresAt,
    status: 'pending',
    method,
    encryptedToken,
    signature,
  };
}

export function createNFCPayload(
  recipientId: string,
  amount: number
): NFCPayload {
  const timestamp = Date.now();
  const token = generateSecureToken();
  const baseData = { recipientId, amount, timestamp };
  
  return {
    recipientId,
    amount,
    token,
    timestamp,
    signature: generateSignature(baseData),
  };
}

export function isPaymentExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

export function formatExpirationTime(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return 'Expired';
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
