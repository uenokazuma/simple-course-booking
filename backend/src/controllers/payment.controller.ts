import { processPaymentWebhook, triggerPaymentRequest } from '../services/payment.service.js';

export const triggerPayment = async (req: any, res: any): Promise<any> => {
  try {
    const { booking_id } = req.body ?? {};
    const user = req.user as { userId: number; roles: string[] } | undefined;

    if (!booking_id) {
      return res.status(400).json({ error: 'booking_id is required' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await triggerPaymentRequest(Number(booking_id), user);
    return res.status(200).json({
      message: 'Payment can proceed. Capacity is available.',
      booking: result.booking,
      payment_attempt: result.paymentAttempt
    });
  } catch (error: any) {
    const statusCode = Number(error?.statusCode ?? 500);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(statusCode).json({ error: message });
  }
};

export const paymentWebhook = async (req: any, res: any): Promise<any> => {
  try {
    const { transaction_reference, status } = req.body ?? {};

    if (!transaction_reference || !status) {
      return res.status(400).json({ error: 'transaction_reference and status are required' });
    }

    if (status !== 'SUCCESSFUL' && status !== 'FAILED') {
      return res.status(200).json({ message: 'Webhook received for non-successful status' });
    }

    const webhookResult = await processPaymentWebhook(transaction_reference, status);

    if (!webhookResult.success && webhookResult.reason === 'FAILED') {
      return res.status(200).json({ message: 'Payment failed and booking cancelled' });
    }

    if (!webhookResult.success && webhookResult.reason === 'CLASS_FULL') {
      return res.status(422).json({ error: 'Class full, payment rejected, initiate gateway refund' });
    }

    return res.status(200).json({ message: 'Payment processed and booking confirmed' });
  } catch (error: any) {
    const statusCode = Number(error?.statusCode ?? 500);
    const message = error instanceof Error ? error.message : 'Internal server error';

    if (statusCode === 200) {
      return res.status(200).json({ message });
    }

    return res.status(statusCode).json({ error: message });
  }
};
