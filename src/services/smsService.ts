// KilaKona SMS API Configuration
// IMPORTANT: In a real-world scenario, you should NOT expose your API Key/Secret in the frontend.
// It is recommended to create a backend endpoint (e.g. Firebase Cloud Function) that handles the SMS sending.
const KILAKONA_API_KEY = import.meta.env.VITE_KILAKONA_API_KEY || 'mushi';
const KILAKONA_API_SECRET = import.meta.env.VITE_KILAKONA_API_SECRET || 'jytUxmm6S9MdcJ47zcsK';
const KILAKONA_SENDER_ID = import.meta.env.VITE_KILAKONA_SENDER_ID || 'TULETE';

// Admin phone numbers to receive the SMS
const ADMIN_PHONES = ['255764587748']; 
// Unaweza kuongeza namba zaidi kama hapa chini

// const ADMIN_PHONES = ['255764587748', '255757449734']; 

export const smsService = {
  /**
   * Sends a bulk SMS using KilaKona API.
   * @param message The text message to send.
   * @param contacts Array of phone numbers in the format 255XXXXXXXXX.
   */
  async sendBulkSMSKilaKona(message: string, contacts: string[], deliveryReportUrl?: string): Promise<any> {
    try {
      const url = 'https://messaging.kilakona.co.tz/api/v1/vendor/message/send';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_key': KILAKONA_API_KEY,
          'api_secret': KILAKONA_API_SECRET,
        },
        body: JSON.stringify({
          senderId: KILAKONA_SENDER_ID,
          messageType: 'text',
          message: message,
          contacts: contacts.join(','),
          ...(deliveryReportUrl && { deliveryReportUrl }),
        }),
      });

      const responseBody = await response.json();

      if (response.ok) {
        return responseBody;
      } else {
        throw new Error(`Failed to send SMS (${response.status}): ${JSON.stringify(responseBody)}`);
      }
    } catch (e) {
      console.error('Error sending SMS via KilaKona:', e);
      // We don't throw here so that order placement doesn't fail if SMS fails
      return null;
    }
  },

  /**
   * Sends an order notification to the admin.
   */
  async sendAdminOrderNotification(order: any): Promise<void> {
    try {
      const { items = [], totalAmount = 0, deliveryLocation = { address: 'N/A' }, storeName = '', uname = 'Customer' } = order || {};
      const itemsList = Array.isArray(items) ? items.map((i: any) => `${i.quantity || 1} x ${i.name || 'Item'}`).join(', ') : '';

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateTimeStr = `${dateStr} ${timeStr}`;
      
      const message = `New Tulete Order!\nDate: ${dateTimeStr}\nFrom: ${uname}\nItems: ${itemsList}\nTotal: ${totalAmount}/=\nLoc: ${deliveryLocation.address || 'N/A'}\nStore: ${storeName || 'N/A'}`;
      
      await this.sendBulkSMSKilaKona(message, ADMIN_PHONES);
    } catch (e) {
      console.error('Failed to notify admin via SMS:', e);
    }
  }
};
