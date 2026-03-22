import { z } from 'zod';
import { PaymentMethod } from '../../shared/types/enums';

export const requestBillSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod).optional().default(PaymentMethod.CASH),
});

export const completePaymentSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
});

export type RequestBillInput = z.infer<typeof requestBillSchema>;
export type CompletePaymentInput = z.infer<typeof completePaymentSchema>;
