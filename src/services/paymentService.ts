import { apiClient } from './api';
import type { PaymentRecord, RazorpayOrderSession } from '../types';

export const paymentService = {
  async createRazorpayOrder(payload: {
    orderId: number;
    method: string;
    instrumentLabel?: string;
  }): Promise<RazorpayOrderSession> {
    const { data } = await apiClient.post('/payments/razorpay/order', payload);
    return data;
  },

  async verifyRazorpayPayment(payload: {
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    method: string;
    maskedInstrument: string;
    outcome: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  }): Promise<{ payment: PaymentRecord; razorpayPaymentId: string; verifiedSignature: string }> {
    const { data } = await apiClient.post('/payments/razorpay/verify', payload);
    return data;
  },

  async initiatePayment(payload: {
    orderId: number;
    method: string;
    upiId?: string;
    last4?: string;
    cardBrand?: string;
    bankName?: string;
  }): Promise<PaymentRecord> {
    const { data } = await apiClient.post('/payments/initiate', payload);
    return data.payment;
  },

  async verifyPayment(transactionRef: string, outcome: 'SUCCESS' | 'FAILED' | 'CANCELLED'): Promise<PaymentRecord> {
    const { data } = await apiClient.post('/payments/verify', { transactionRef, outcome });
    return data.payment;
  },
};
