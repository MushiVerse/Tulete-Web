/* eslint-disable @typescript-eslint/no-explicit-any */
const SNIPPE_BASE_URL = import.meta.env.VITE_SNIPPE_BASE_URL || 'https://api.snippe.sh';
const SNIPPE_API_KEY = import.meta.env.VITE_SNIPPE_API_KEY || '';

export interface MobilePaymentParams {
  amount: number;
  phoneNumber: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  orderId: string;
  network?: string;
  webhookUrl?: string;
}

export interface PaymentSessionParams {
  amount: number;
  customer?: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };
  orderId: string;
  redirectUrl?: string;
  webhookUrl?: string;
  description?: string;
}

export interface SnippePaymentResponse {
  status: 'success' | 'error';
  code?: number;
  data?: {
    reference?: string;
    id?: string;
    status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired';
    checkout_url?: string;
    expires_at?: string;
    [key: string]: any;
  };
  error_code?: string;
  message?: string;
}

/**
 * Normalizes Tanzanian phone numbers to standard 12-digit format (2557XXXXXXXX or 2556XXXXXXXX)
 */
export function formatSnippePhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.startsWith('255') && digitsOnly.length === 12) {
    return digitsOnly;
  }
  if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
    return `255${digitsOnly.substring(1)}`;
  }
  if (digitsOnly.length === 9 && (digitsOnly.startsWith('7') || digitsOnly.startsWith('6'))) {
    return `255${digitsOnly}`;
  }
  return digitsOnly;
}

class SnippeService {
  private getHeaders(idempotencyKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SNIPPE_API_KEY}`,
    };
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey.substring(0, 30);
    }
    return headers;
  }

  /**
   * Initiates Mobile Money USSD Push payment (POST /v1/payments)
   * Supported networks: Airtel Money, M-Pesa, Mixx by Yas, Halotel
   */
  async createMobilePayment(params: MobilePaymentParams): Promise<SnippePaymentResponse> {
    const formattedPhone = formatSnippePhoneNumber(params.phoneNumber);
    const idempotencyKey = `ord-${params.orderId.slice(-12)}-${Date.now().toString().slice(-10)}`;

    const payload = {
      payment_type: 'mobile',
      details: {
        amount: Math.round(params.amount),
        currency: 'TZS',
      },
      phone_number: formattedPhone,
      customer: {
        firstname: params.firstname || 'Customer',
        lastname: params.lastname || 'User',
        email: params.email || 'customer@tulete.net',
      },
      webhook_url: params.webhookUrl || `${window.location.origin}/api/webhooks/snippe`,
      metadata: {
        order_id: params.orderId,
        ...(params.network && { network: params.network }),
      },
    };

    try {
      const response = await fetch(`${SNIPPE_BASE_URL}/v1/payments`, {
        method: 'POST',
        headers: this.getHeaders(idempotencyKey),
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      if (!response.ok && resData.status !== 'success') {
        return {
          status: 'error',
          code: response.status,
          error_code: resData.error_code || 'payment_failed',
          message: resData.message || 'Failed to initiate Mobile Money payment.',
        };
      }
      return resData;
    } catch (err: any) {
      console.error('Snippe Mobile Payment Error:', err);
      return {
        status: 'error',
        message: err.message || 'Network error connecting to payment gateway.',
      };
    }
  }

  /**
   * Creates a Hosted Payment Session for Cards & Mobile Money (POST /api/v1/sessions)
   */
  async createPaymentSession(params: PaymentSessionParams): Promise<SnippePaymentResponse> {
    const payload = {
      amount: Math.round(params.amount),
      currency: 'TZS',
      allowed_methods: ['mobile_money'],
      customer: {
        firstname: params.customer?.firstname || 'Customer',
        lastname: params.customer?.lastname || 'User',
        email: params.customer?.email || 'customer@tulete.net',
      },
      redirect_url: params.redirectUrl || `${window.location.origin}/tracking/${params.orderId}`,
      webhook_url: params.webhookUrl || `${window.location.origin}/api/webhooks/snippe`,
      description: params.description || `Tulete Order Payment #${params.orderId}`,
      metadata: {
        order_id: params.orderId,
      },
    };

    try {
      const response = await fetch(`${SNIPPE_BASE_URL}/api/v1/sessions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      if (!response.ok && resData.status !== 'success') {
        return {
          status: 'error',
          code: response.status,
          error_code: resData.error_code || 'session_failed',
          message: resData.message || 'Failed to create payment session.',
        };
      }
      return resData;
    } catch (err: any) {
      console.error('Snippe Payment Session Error:', err);
      return {
        status: 'error',
        message: err.message || 'Network error creating payment session.',
      };
    }
  }

  /**
   * Checks current status of a payment intent (GET /v1/payments/{reference})
   */
  async checkPaymentStatus(reference: string): Promise<SnippePaymentResponse> {
    try {
      const response = await fetch(`${SNIPPE_BASE_URL}/v1/payments/${reference}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const resData = await response.json();
      return resData;
    } catch (err: any) {
      console.error('Snippe Check Payment Status Error:', err);
      return {
        status: 'error',
        message: err.message || 'Failed to check payment status.',
      };
    }
  }
}

export const snippeService = new SnippeService();
