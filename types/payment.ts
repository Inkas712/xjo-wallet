export type PaymentMethod = 'nfc' | 'ble' | 'code';

export interface PaymentRequestData {
  id: string;
  senderId: string;
  senderName: string;
  recipientId?: string;
  recipientName?: string;
  amount: number;
  currency: string;
  note?: string;
  timestamp: number;
  expiresAt: number;
  status: 'pending' | 'matched' | 'completed' | 'expired' | 'cancelled';
  method: PaymentMethod;
  encryptedToken: string;
  signature: string;
}

export interface PaymentCode {
  code: string;
  paymentData: PaymentRequestData;
  createdAt: number;
  expiresAt: number;
  isUsed: boolean;
}

export interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  isConnectable: boolean;
  userId?: string;
  userName?: string;
}

export interface NFCPayload {
  recipientId: string;
  amount: number;
  token: string;
  timestamp: number;
  signature: string;
}

export interface PaymentSession {
  sessionId: string;
  senderId: string;
  recipientId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: 'awaiting' | 'connected' | 'confirmed' | 'completed' | 'failed';
  createdAt: number;
  expiresAt: number;
}
