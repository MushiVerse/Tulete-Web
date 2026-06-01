import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';

export type MessageType = 'text' | 'image' | 'file' | 'location' | 'order_reference' | 'store_reference';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface MessageLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface Message extends BaseDocument {
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  location?: MessageLocation;
  referenceId?: string;
  referenceTitle?: string;
  status: MessageStatus;
}

export interface ParticipantDetail {
  name: string;
  avatarUrl: string;
  isOnline?: boolean;
}

export interface Conversation extends BaseDocument {
  participants: string[];
  participantDetails: { [userId: string]: ParticipantDetail };
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: any;
    type: MessageType;
  };
  unreadCounts: { [userId: string]: number };
}

class MessageService extends BaseFirestoreService<Message> {
  constructor() {
    super('messages');
  }

  /**
   * Mock initial conversations list for offline-first cached layout testing
   */
  getMockConversations(currentUserId: string): Conversation[] {
    return [
      {
        id: 'conv_mama_safi',
        participants: [currentUserId, 'store_mama_safi'],
        participantDetails: {
          [currentUserId]: { name: 'You', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80' },
          'store_mama_safi': { name: 'Mama Safi Laundry', avatarUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebd01?w=80', isOnline: true }
        },
        lastMessage: {
          content: 'Hi! Your executive suit is fully pressed and ready for dispatch. Please confirm delivery location.',
          senderId: 'store_mama_safi',
          createdAt: new Date(Date.now() - 1000 * 60 * 15),
          type: 'text'
        },
        unreadCounts: {
          [currentUserId]: 1,
          'store_mama_safi': 0
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        updatedAt: new Date(Date.now() - 1000 * 60 * 15)
      },
      {
        id: 'conv_mwangi_driver',
        participants: [currentUserId, 'driver_mwangi'],
        participantDetails: {
          [currentUserId]: { name: 'You', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80' },
          'driver_mwangi': { name: 'Mwangi (Delivery Attendant)', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', isOnline: true }
        },
        lastMessage: {
          content: 'Just loaded the Chapati combos! I am heading out to Wood Avenue right now.',
          senderId: 'driver_mwangi',
          createdAt: new Date(Date.now() - 1000 * 60 * 5),
          type: 'text'
        },
        unreadCounts: {
          [currentUserId]: 0,
          'driver_mwangi': 0
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
        updatedAt: new Date(Date.now() - 1000 * 60 * 5)
      },
      {
        id: 'conv_tulete_support',
        participants: [currentUserId, 'tulete_support'],
        participantDetails: {
          [currentUserId]: { name: 'You', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80' },
          'tulete_support': { name: 'Tulete Concierge Support', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', isOnline: false }
        },
        lastMessage: {
          content: 'No problem! Your payment verification has been cleared successfully.',
          senderId: 'tulete_support',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
          type: 'text'
        },
        unreadCounts: {
          [currentUserId]: 0,
          'tulete_support': 0
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
      }
    ];
  }

  /**
   * Mock messages history database matching mock conversations
   */
  getMockMessages(conversationId: string): Message[] {
    const now = Date.now();
    const mamaSafiMsgs: Message[] = [
      {
        id: 'msg_l1',
        conversationId: 'conv_mama_safi',
        senderId: 'user_current',
        content: 'Hello Mama Safi, is my laundry order scheduled for folding today?',
        type: 'text',
        status: 'read',
        createdAt: new Date(now - 1000 * 60 * 30)
      },
      {
        id: 'msg_l2',
        conversationId: 'conv_mama_safi',
        senderId: 'store_mama_safi',
        content: 'Hi! Your executive suit is fully pressed and ready for dispatch. Please confirm delivery location.',
        type: 'text',
        status: 'read',
        createdAt: new Date(now - 1000 * 60 * 15)
      }
    ];

    const driverMsgs: Message[] = [
      {
        id: 'msg_d1',
        conversationId: 'conv_mwangi_driver',
        senderId: 'user_current',
        content: 'Hi Mwangi, did you pick up the Kibanda food order yet?',
        type: 'text',
        status: 'read',
        createdAt: new Date(now - 1000 * 60 * 10)
      },
      {
        id: 'msg_d2',
        conversationId: 'conv_mwangi_driver',
        senderId: 'driver_mwangi',
        content: 'Just loaded the Chapati combos! I am heading out to Wood Avenue right now.',
        type: 'text',
        status: 'read',
        createdAt: new Date(now - 1000 * 60 * 5)
      }
    ];

    const supportMsgs: Message[] = [
      {
        id: 'msg_s1',
        conversationId: 'conv_tulete_support',
        senderId: 'user_current',
        content: 'I had an issue with the M-Pesa STK push earlier, can you check if transaction was approved?',
        type: 'text',
        status: 'read',
        createdAt: new Date(now - 1000 * 60 * 60 * 25)
      },
      {
        id: 'msg_s2',
        conversationId: 'conv_tulete_support',
        senderId: 'tulete_support',
        content: 'No problem! Your payment verification has been cleared successfully.',
        type: 'text',
        status: 'read',
        createdAt: new Date(now - 1000 * 60 * 60 * 24)
      }
    ];

    if (conversationId === 'conv_mama_safi') return mamaSafiMsgs;
    if (conversationId === 'conv_mwangi_driver') return driverMsgs;
    if (conversationId === 'conv_tulete_support') return supportMsgs;
    return [];
  }

  /**
   * Helper to return dynamic auto-replies to test typing state and responses in real-time
   */
  getAutoReply(conversationId: string, userText: string): string {
    const cleanText = userText.toLowerCase();
    
    if (conversationId === 'conv_mama_safi') {
      if (cleanText.includes('location') || cleanText.includes('address')) {
        return 'Perfect, that is logged! Dispatch rider is loading the bag and will depart in 5 minutes.';
      }
      if (cleanText.includes('thank') || cleanText.includes('asante')) {
        return 'You are most welcome! Thank you for choosing Mama Safi Laundry.';
      }
      return 'Received! Let me verify that with our laundry attendant right away and get back to you.';
    }

    if (conversationId === 'conv_mwangi_driver') {
      if (cleanText.includes('where') || cleanText.includes('delay')) {
        return 'Traffic is slightly heavy near Yaya Center, but I am navigating through. ETA is 8 minutes!';
      }
      if (cleanText.includes('number') || cleanText.includes('phone')) {
        return 'You can reach me directly at +254 711 222333 if you need to redirect the delivery.';
      }
      return 'Got it! I am focusing on the road but heading your way rapidly. See you soon!';
    }

    return 'Thank you for contacting Tulete Concierge Support. An agent is reviewing your query and will reply shortly.';
  }
}

export const messageService = new MessageService();
export const conversationService = {
  // Shared export reference
  getMockConversations: (userId: string) => messageService.getMockConversations(userId)
};
