import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../../../core/firebase/config';

// KilaKona SMS Configuration
const KILAKONA_API_KEY = import.meta.env.VITE_KILAKONA_API_KEY || 'mushi';
const KILAKONA_API_SECRET = import.meta.env.VITE_KILAKONA_API_SECRET || 'jytUxmm6S9MdcJ47zcsK';
const KILAKONA_SENDER_ID = import.meta.env.VITE_KILAKONA_SENDER_ID || 'TULETE';
const KILAKONA_API_URL = 'https://messaging.kilakona.co.tz/api/v1/vendor/message/send';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  formattedPhone: string;
  isValidPhone: boolean;
  address?: string;
  officeAttended?: string;
  lastUpdated?: any;
}

export interface SMSCampaignLog {
  id?: string;
  message: string;
  recipientCount: number;
  successCount: number;
  failedCount: number;
  recipientsSample: string[];
  status: 'completed' | 'failed' | 'partial';
  sentBy: string;
  createdAt: any;
  targetType: 'all' | 'selected' | 'manual' | 'branch';
  branchFilter?: string;
  apiResponse?: any;
}

/**
 * Normalizes phone numbers to Tanzanian standard (255XXXXXXXXX).
 */
export function formatTanzanianPhone(phone: string): { formatted: string; isValid: boolean } {
  if (!phone) return { formatted: '', isValid: false };
  
  let clean = phone.replace(/[^\d]/g, '').trim();

  // Convert leading 0 to 255 (e.g. 0757449734 -> 255757449734)
  if (clean.startsWith('0') && clean.length === 10) {
    clean = '255' + clean.substring(1);
  } else if (!clean.startsWith('255') && clean.length === 9) {
    clean = '255' + clean;
  }

  // Valid Tanzanian phone: 12 digits, starts with 255 followed by 6 or 7
  const isValid = /^255[67]\d{8}$/.test(clean);

  return { formatted: clean, isValid };
}

/**
 * Calculate the number of SMS segments based on standard GSM-7 encoding (160 chars per SMS).
 */
export function calculateSMSSegments(message: string): { charCount: number; segments: number; maxCharsPerSegment: number } {
  const charCount = message.length;
  if (charCount === 0) return { charCount: 0, segments: 0, maxCharsPerSegment: 160 };

  // GSM standard: 160 chars for 1 part, 153 chars/part for multi-part messages
  if (charCount <= 160) {
    return { charCount, segments: 1, maxCharsPerSegment: 160 };
  } else {
    const segments = Math.ceil(charCount / 153);
    return { charCount, segments, maxCharsPerSegment: 153 };
  }
}

export const adminSmsService = {
  /**
   * Subscribe to the Firestore 'customers' collection in real-time.
   */
  subscribeCustomers(onUpdate: (customers: Customer[]) => void, onError?: (err: any) => void) {
    const customersRef = collection(db, 'customers');
    return onSnapshot(
      customersRef,
      (snapshot) => {
        const list: Customer[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const rawPhone = (data.phone || docSnap.id || '').toString();
          const { formatted, isValid } = formatTanzanianPhone(rawPhone);
          const name = (data.name || data.uname || 'Customer').toString().trim();
          const address = (data.address || data.location || '').toString().trim();
          const officeAttended = (data.officeAttended || data.branch || '').toString().trim();

          list.push({
            id: docSnap.id,
            name: name || 'Unnamed Customer',
            phone: rawPhone,
            formattedPhone: formatted,
            isValidPhone: isValid,
            address: address || 'N/A',
            officeAttended: officeAttended || 'Main',
            lastUpdated: data.lastUpdated || data.time || null,
          });
        });

        // Sort alphabetically by name
        list.sort((a, b) => a.name.localeCompare(b.name));
        onUpdate(list);
      },
      (err) => {
        console.error('Error listening to customers collection:', err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Fetch all customers from Firestore once.
   */
  async fetchCustomers(): Promise<Customer[]> {
    try {
      const customersRef = collection(db, 'customers');
      const snapshot = await getDocs(customersRef);
      const list: Customer[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const rawPhone = (data.phone || docSnap.id || '').toString();
        const { formatted, isValid } = formatTanzanianPhone(rawPhone);
        const name = (data.name || data.uname || 'Customer').toString().trim();
        const address = (data.address || data.location || '').toString().trim();
        const officeAttended = (data.officeAttended || data.branch || '').toString().trim();

        list.push({
          id: docSnap.id,
          name: name || 'Unnamed Customer',
          phone: rawPhone,
          formattedPhone: formatted,
          isValidPhone: isValid,
          address: address || 'N/A',
          officeAttended: officeAttended || 'Main',
          lastUpdated: data.lastUpdated || data.time || null,
        });
      });

      list.sort((a, b) => a.name.localeCompare(b.name));
      return list;
    } catch (e) {
      console.error('Failed to fetch customers:', e);
      throw e;
    }
  },

  /**
   * Send single batch to KilaKona API endpoint.
   */
  async sendSingleBatchKilaKona(message: string, contacts: string[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!contacts || contacts.length === 0) {
        return { success: false, error: 'No recipients specified.' };
      }

      const payload = {
        senderId: KILAKONA_SENDER_ID,
        messageType: 'text',
        message: message,
        contacts: contacts.join(','),
      };

      const response = await fetch(KILAKONA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_key': KILAKONA_API_KEY,
          'api_secret': KILAKONA_API_SECRET,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        return { success: true, data: responseData };
      } else {
        const errorMsg = responseData?.message || responseData?.error || `HTTP ${response.status}`;
        return { success: false, error: errorMsg, data: responseData };
      }
    } catch (e: any) {
      console.error('KilaKona API Network/Execution Error:', e);
      return { success: false, error: e.message || 'Network error communicating with KilaKona SMS server.' };
    }
  },

  /**
   * Send SMS to a list of recipients with chunking and progress reporting.
   * If message contains personal variables like `{name}` or `{office}`, it sends personalized messages per recipient.
   */
  async broadcastSMS({
    messageTemplate,
    recipients,
    onProgress,
    targetType = 'selected',
    branchFilter,
  }: {
    messageTemplate: string;
    recipients: Customer[];
    onProgress?: (sentCount: number, totalCount: number, currentBatch: number, totalBatches: number) => void;
    targetType?: 'all' | 'selected' | 'manual' | 'branch';
    branchFilter?: string;
  }): Promise<{
    success: boolean;
    totalSent: number;
    totalFailed: number;
    batchResults: any[];
    campaignId?: string;
  }> {
    const validRecipients = recipients.filter((r) => r.isValidPhone && r.formattedPhone);
    if (validRecipients.length === 0) {
      throw new Error('No valid Tanzanian phone numbers in the selected recipients.');
    }

    const hasPlaceholders = messageTemplate.includes('{name}') || messageTemplate.includes('{office}') || messageTemplate.includes('{address}');
    
    let totalSent = 0;
    let totalFailed = 0;
    const batchResults: any[] = [];

    if (hasPlaceholders) {
      // Personalized sending: Send per recipient or in micro-batches
      const total = validRecipients.length;
      for (let i = 0; i < total; i++) {
        const customer = validRecipients[i];
        const personalizedMessage = messageTemplate
          .replace(/\{name\}/gi, customer.name || 'Mteja')
          .replace(/\{office\}/gi, customer.officeAttended || 'Tulete')
          .replace(/\{address\}/gi, customer.address || '');

        const res = await this.sendSingleBatchKilaKona(personalizedMessage, [customer.formattedPhone]);
        batchResults.push(res);
        if (res.success) {
          totalSent += 1;
        } else {
          totalFailed += 1;
        }

        if (onProgress) {
          onProgress(i + 1, total, i + 1, total);
        }

        // Small delay between personalized requests to respect rate limits
        if (i < total - 1) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }
    } else {
      // Bulk sending: Group recipients into chunks of 100 for optimal KilaKona bulk throughput
      const CHUNK_SIZE = 100;
      const chunks: Customer[][] = [];
      for (let i = 0; i < validRecipients.length; i += CHUNK_SIZE) {
        chunks.push(validRecipients.slice(i, i + CHUNK_SIZE));
      }

      const totalBatches = chunks.length;

      for (let bIndex = 0; bIndex < totalBatches; bIndex++) {
        const currentChunk = chunks[bIndex];
        const phoneList = currentChunk.map((c) => c.formattedPhone);

        const res = await this.sendSingleBatchKilaKona(messageTemplate, phoneList);
        batchResults.push(res);

        if (res.success) {
          totalSent += currentChunk.length;
        } else {
          totalFailed += currentChunk.length;
        }

        if (onProgress) {
          onProgress(totalSent + totalFailed, validRecipients.length, bIndex + 1, totalBatches);
        }

        if (bIndex < totalBatches - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    }

    // Save Campaign Log to Firestore
    let campaignId: string | undefined;
    try {
      const campaignStatus = totalFailed === 0 ? 'completed' : totalSent === 0 ? 'failed' : 'partial';
      const currentUser = auth.currentUser;
      const campaignsRef = collection(db, 'sms_campaigns');

      const logDoc = await addDoc(campaignsRef, {
        message: messageTemplate,
        recipientCount: validRecipients.length,
        successCount: totalSent,
        failedCount: totalFailed,
        recipientsSample: validRecipients.slice(0, 10).map((r) => `${r.name} (${r.formattedPhone})`),
        status: campaignStatus,
        sentBy: currentUser?.email || currentUser?.uid || 'Admin',
        createdAt: serverTimestamp(),
        targetType,
        branchFilter: branchFilter || 'All',
        apiResponse: batchResults.slice(0, 3), // Store small sample of API response
      });
      campaignId = logDoc.id;
    } catch (logErr) {
      console.warn('Failed to save SMS campaign log to Firestore:', logErr);
    }

    return {
      success: totalSent > 0,
      totalSent,
      totalFailed,
      batchResults,
      campaignId,
    };
  },

  /**
   * Fetch previous SMS campaigns history.
   */
  async fetchCampaignHistory(maxCount = 20): Promise<SMSCampaignLog[]> {
    try {
      const campaignsRef = collection(db, 'sms_campaigns');
      const q = query(campaignsRef, orderBy('createdAt', 'desc'), limit(maxCount));
      const snap = await getDocs(q);
      const logs: SMSCampaignLog[] = [];
      snap.forEach((d) => {
        logs.push({ id: d.id, ...d.data() } as SMSCampaignLog);
      });
      return logs;
    } catch (e) {
      console.warn('Error fetching campaign history:', e);
      return [];
    }
  },
};
