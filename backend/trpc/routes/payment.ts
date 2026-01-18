import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

interface StoredPaymentCode {
  code: string;
  senderId: string;
  senderName: string;
  amount: number;
  currency: string;
  note?: string;
  createdAt: number;
  expiresAt: number;
  isUsed: boolean;
  recipientId?: string;
  recipientName?: string;
  status: 'pending' | 'matched' | 'completed' | 'expired';
}

interface NearbyUser {
  id: string;
  name: string;
  lastSeen: number;
  deviceName: string;
}

interface NearbyPaymentRequest {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  amount: number;
  currency: string;
  note?: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
}

const paymentCodes = new Map<string, StoredPaymentCode>();
const nearbyUsers = new Map<string, NearbyUser>();
const nearbyPaymentRequests = new Map<string, NearbyPaymentRequest>();

function cleanExpiredCodes() {
  const now = Date.now();
  for (const [code, data] of paymentCodes.entries()) {
    if (now > data.expiresAt) {
      paymentCodes.delete(code);
    }
  }
}

function generateCode(): string {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (paymentCodes.has(code)) {
    return generateCode();
  }
  return code;
}

function cleanExpiredUsers() {
  const now = Date.now();
  const timeout = 30 * 1000; // 30 seconds timeout
  for (const [id, user] of nearbyUsers.entries()) {
    if (now - user.lastSeen > timeout) {
      nearbyUsers.delete(id);
    }
  }
}

function cleanExpiredPaymentRequests() {
  const now = Date.now();
  for (const [id, request] of nearbyPaymentRequests.entries()) {
    if (now > request.expiresAt) {
      nearbyPaymentRequests.delete(id);
    }
  }
}

export const paymentRouter = createTRPCRouter({
  // Nearby discovery - register user as available
  registerNearby: publicProcedure
    .input(z.object({
      userId: z.string(),
      userName: z.string(),
      deviceName: z.string(),
    }))
    .mutation(({ input }) => {
      cleanExpiredUsers();
      
      nearbyUsers.set(input.userId, {
        id: input.userId,
        name: input.userName,
        deviceName: input.deviceName,
        lastSeen: Date.now(),
      });
      
      console.log(`User ${input.userName} registered as nearby`);
      
      return { success: true };
    }),

  // Heartbeat to keep user visible
  heartbeat: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(({ input }) => {
      const user = nearbyUsers.get(input.userId);
      if (user) {
        user.lastSeen = Date.now();
        nearbyUsers.set(input.userId, user);
      }
      return { success: true };
    }),

  // Unregister from nearby
  unregisterNearby: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(({ input }) => {
      nearbyUsers.delete(input.userId);
      return { success: true };
    }),

  // Get nearby users (excluding self)
  getNearbyUsers: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(({ input }) => {
      cleanExpiredUsers();
      
      const users: { id: string; name: string; deviceName: string; signalStrength: number }[] = [];
      
      for (const [id, user] of nearbyUsers.entries()) {
        if (id !== input.userId) {
          // Simulate signal strength based on how recently they pinged
          const timeSinceLastSeen = Date.now() - user.lastSeen;
          const signalStrength = Math.max(0, 100 - Math.floor(timeSinceLastSeen / 100));
          
          users.push({
            id: user.id,
            name: user.name,
            deviceName: user.deviceName,
            signalStrength,
          });
        }
      }
      
      return { users };
    }),

  // Send nearby payment request
  sendNearbyPayment: publicProcedure
    .input(z.object({
      senderId: z.string(),
      senderName: z.string(),
      recipientId: z.string(),
      amount: z.number().positive(),
      currency: z.string().default('USD'),
      note: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const requestId = `npr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();
      
      const request: NearbyPaymentRequest = {
        id: requestId,
        senderId: input.senderId,
        senderName: input.senderName,
        recipientId: input.recipientId,
        amount: input.amount,
        currency: input.currency,
        note: input.note,
        createdAt: now,
        expiresAt: now + 2 * 60 * 1000, // 2 minutes
        status: 'pending',
      };
      
      nearbyPaymentRequests.set(requestId, request);
      
      console.log(`Nearby payment request ${requestId} from ${input.senderName} to ${input.recipientId}`);
      
      return { success: true, requestId };
    }),

  // Get pending payment requests for a user
  getPendingNearbyPayments: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(({ input }) => {
      cleanExpiredPaymentRequests();
      
      const pending: NearbyPaymentRequest[] = [];
      
      for (const request of nearbyPaymentRequests.values()) {
        if (request.recipientId === input.userId && request.status === 'pending') {
          pending.push(request);
        }
      }
      
      return { requests: pending };
    }),

  // Accept or reject nearby payment
  respondToNearbyPayment: publicProcedure
    .input(z.object({
      requestId: z.string(),
      recipientId: z.string(),
      accept: z.boolean(),
    }))
    .mutation(({ input }) => {
      const request = nearbyPaymentRequests.get(input.requestId);
      
      if (!request) {
        return { success: false, error: 'Request not found' };
      }
      
      if (request.recipientId !== input.recipientId) {
        return { success: false, error: 'Unauthorized' };
      }
      
      request.status = input.accept ? 'accepted' : 'rejected';
      nearbyPaymentRequests.set(input.requestId, request);
      
      if (input.accept) {
        // Mark as completed after acceptance
        setTimeout(() => {
          const req = nearbyPaymentRequests.get(input.requestId);
          if (req && req.status === 'accepted') {
            req.status = 'completed';
            nearbyPaymentRequests.set(input.requestId, req);
          }
        }, 1000);
      }
      
      return { success: true, status: request.status };
    }),

  // Check status of sent nearby payment
  getNearbyPaymentStatus: publicProcedure
    .input(z.object({
      requestId: z.string(),
    }))
    .query(({ input }) => {
      const request = nearbyPaymentRequests.get(input.requestId);
      
      if (!request) {
        return { found: false, status: 'not_found' as const };
      }
      
      return {
        found: true,
        status: request.status,
        amount: request.amount,
        currency: request.currency,
      };
    }),

  generateCode: publicProcedure
    .input(z.object({
      senderId: z.string(),
      senderName: z.string(),
      amount: z.number().positive(),
      currency: z.string().default('USD'),
      note: z.string().optional(),
    }))
    .mutation(({ input }) => {
      cleanExpiredCodes();
      
      const code = generateCode();
      const now = Date.now();
      const expiresAt = now + 10 * 60 * 1000;
      
      const paymentData: StoredPaymentCode = {
        code,
        senderId: input.senderId,
        senderName: input.senderName,
        amount: input.amount,
        currency: input.currency,
        note: input.note,
        createdAt: now,
        expiresAt,
        isUsed: false,
        status: 'pending',
      };
      
      paymentCodes.set(code, paymentData);
      
      console.log(`Payment code generated: ${code} for ${input.senderName}`);
      
      return {
        success: true,
        code,
        expiresAt,
        paymentId: `pay_${now}_${Math.random().toString(36).substring(2, 9)}`,
      };
    }),

  verifyCode: publicProcedure
    .input(z.object({
      code: z.string().length(6),
      recipientId: z.string(),
      recipientName: z.string(),
    }))
    .mutation(({ input }) => {
      cleanExpiredCodes();
      
      const paymentData = paymentCodes.get(input.code);
      
      if (!paymentData) {
        return {
          success: false,
          error: 'Invalid or expired code',
        };
      }
      
      if (paymentData.isUsed) {
        return {
          success: false,
          error: 'This code has already been used',
        };
      }
      
      if (Date.now() > paymentData.expiresAt) {
        paymentCodes.delete(input.code);
        return {
          success: false,
          error: 'Code has expired',
        };
      }
      
      if (paymentData.senderId === input.recipientId) {
        return {
          success: false,
          error: 'Cannot send payment to yourself',
        };
      }
      
      paymentData.recipientId = input.recipientId;
      paymentData.recipientName = input.recipientName;
      paymentData.status = 'matched';
      paymentCodes.set(input.code, paymentData);
      
      console.log(`Payment code verified: ${input.code} by ${input.recipientName}`);
      
      return {
        success: true,
        paymentData: {
          senderId: paymentData.senderId,
          senderName: paymentData.senderName,
          amount: paymentData.amount,
          currency: paymentData.currency,
          note: paymentData.note,
        },
      };
    }),

  confirmPayment: publicProcedure
    .input(z.object({
      code: z.string().length(6),
      recipientId: z.string(),
    }))
    .mutation(({ input }) => {
      const paymentData = paymentCodes.get(input.code);
      
      if (!paymentData) {
        return {
          success: false,
          error: 'Payment not found',
        };
      }
      
      if (paymentData.recipientId !== input.recipientId) {
        return {
          success: false,
          error: 'Unauthorized',
        };
      }
      
      paymentData.isUsed = true;
      paymentData.status = 'completed';
      paymentCodes.set(input.code, paymentData);
      
      const transactionId = `TXN_${Date.now().toString(36).toUpperCase()}`;
      
      console.log(`Payment completed: ${transactionId}`);
      
      return {
        success: true,
        transactionId,
        completedAt: Date.now(),
      };
    }),

  getPaymentStatus: publicProcedure
    .input(z.object({
      code: z.string().length(6),
    }))
    .query(({ input }) => {
      const paymentData = paymentCodes.get(input.code);
      
      if (!paymentData) {
        return {
          exists: false,
          status: 'not_found' as const,
        };
      }
      
      if (Date.now() > paymentData.expiresAt) {
        return {
          exists: true,
          status: 'expired' as const,
        };
      }
      
      return {
        exists: true,
        status: paymentData.status,
        isMatched: !!paymentData.recipientId,
        recipientName: paymentData.recipientName,
      };
    }),

  cancelPayment: publicProcedure
    .input(z.object({
      code: z.string().length(6),
      senderId: z.string(),
    }))
    .mutation(({ input }) => {
      const paymentData = paymentCodes.get(input.code);
      
      if (!paymentData) {
        return { success: false, error: 'Payment not found' };
      }
      
      if (paymentData.senderId !== input.senderId) {
        return { success: false, error: 'Unauthorized' };
      }
      
      paymentCodes.delete(input.code);
      
      return { success: true };
    }),
});
