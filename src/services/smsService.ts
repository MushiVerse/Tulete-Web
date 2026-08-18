import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../core/firebase/config';

// KilaKona SMS API Configuration
const KILAKONA_API_KEY = import.meta.env.VITE_KILAKONA_API_KEY || 'mushi';
const KILAKONA_API_SECRET = import.meta.env.VITE_KILAKONA_API_SECRET || 'jytUxmm6S9MdcJ47zcsK';
const KILAKONA_SENDER_ID = import.meta.env.VITE_KILAKONA_SENDER_ID || 'TULETE';

// Main Admin phone numbers to receive the SMS
const ADMIN_PHONES = ['255757449734'
  // uncomment when you want to use the below number
  // , '255764587748'
];

/**
 * Retrieves phone numbers belonging to a specific store from the 'UsersandRoles' collection
 * (JS/TS equivalent of Flutter getPhonesByStore function)
 */
export async function getPhonesByStore(store: string): Promise<string[]> {
  try {
    if (!store || store.trim() === '') return [];
    const usersAndRolesRef = collection(db, 'UsersandRoles');
    const q = query(usersAndRolesRef, where('store', '==', store.trim()));
    const querySnapshot = await getDocs(q);
    const phoneNumbers: string[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.phone && typeof data.phone === 'string') {
        let phone = data.phone.trim().replace(/\+/g, '').replace(/\s+/g, '');
        if (phone.startsWith('0')) {
          phone = '255' + phone.substring(1);
        }
        if (phone) phoneNumbers.push(phone);
      }
    });

    return phoneNumbers;
  } catch (e) {
    console.error('Error retrieving store phone numbers from UsersandRoles:', e);
    return [];
  }
}

export const smsService = {
  /**
   * Sends a bulk SMS using KilaKona API.
   * @param message The text message to send.
   * @param contacts Array of phone numbers in the format 255XXXXXXXXX.
   */
  async sendBulkSMSKilaKona(message: string, contacts: string[], deliveryReportUrl?: string): Promise<any> {
    try {
      if (!contacts || contacts.length === 0) return null;
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
   * Sends an order notification to the admin (255764587748) and the store vendor phone numbers.
   */
  async sendAdminOrderNotification(order: any): Promise<void> {
    try {
      const { items = [], totalAmount = 0, deliveryLocation = { address: 'N/A' }, storeName = '', uname = 'Customer' } = order || {};
      const itemsList = Array.isArray(items) ? items.map((i: any) => `${i.quantity || 1} x ${i.name || 'Item'}`).join(', ') : '';

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateTimeStr = `${dateStr} ${timeStr}`;
      
      const message = `New Order!\nDate: ${dateTimeStr}\nFrom: ${uname}\nItems: ${itemsList}\nTotal: ${totalAmount}/=\nLoc: ${deliveryLocation.address || 'N/A'}`;
      
      // Fetch specific phone numbers for this store from UsersandRoles
      const storePhones = await getPhonesByStore(storeName);

      // Merge main admin phone '255764587748' and store vendor phones
      const recipientPhones = Array.from(new Set([...ADMIN_PHONES, ...storePhones]));

      await this.sendBulkSMSKilaKona(message, recipientPhones);
    } catch (e) {
      console.error('Failed to notify admin and store via SMS:', e);
    }
  }
};
