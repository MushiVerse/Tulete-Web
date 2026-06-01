import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { messageService, Message, Conversation } from '../services/messageService';

interface MessageStore {
  conversations: Conversation[];
  activeMessages: { [convId: string]: Message[] };
  typingStates: { [convId: string]: boolean };
  unreadCounts: { [convId: string]: number };
  
  // Actions
  initialize: (userId: string) => void;
  selectConversation: (convId: string) => void;
  sendMessage: (convId: string, senderId: string, content: string, options?: Partial<Message>) => void;
  markAsRead: (convId: string, userId: string) => void;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  conversations: [],
  activeMessages: {},
  typingStates: {},
  unreadCounts: {},

  initialize: (userId) => {
    // Prevent double initialization
    if (get().conversations.length > 0) return;

    // Load mock initial data
    const mockConvs = messageService.getMockConversations(userId);
    const initialMsgs: { [convId: string]: Message[] } = {};
    const initialUnreads: { [convId: string]: number } = {};

    mockConvs.forEach((conv) => {
      initialMsgs[conv.id] = messageService.getMockMessages(conv.id);
      initialUnreads[conv.id] = conv.unreadCounts[userId] || 0;
    });

    set({
      conversations: mockConvs,
      activeMessages: initialMsgs,
      unreadCounts: initialUnreads,
    });
  },

  selectConversation: (convId) => {
    // Clear unread counts for selected conversation locally
    const unreads = { ...get().unreadCounts };
    unreads[convId] = 0;
    
    // Also adjust unread in conversation detail list
    const convs = get().conversations.map((c) => {
      if (c.id === convId) {
        return {
          ...c,
          unreadCounts: {
            ...c.unreadCounts,
            user_current: 0,
          },
        };
      }
      return c;
    });

    set({ unreadCounts: unreads, conversations: convs });
  },

  sendMessage: (convId, senderId, content, options = {}) => {
    const activeMsgs = { ...get().activeMessages };
    const currentMsgs = activeMsgs[convId] || [];

    // Create optimistic user message
    const userMsg: Message = {
      id: `msg_opt_${Date.now()}`,
      conversationId: convId,
      senderId,
      content,
      type: options.type || 'text',
      status: 'sending',
      createdAt: new Date(),
      ...options,
    };

    activeMsgs[convId] = [...currentMsgs, userMsg];

    // Update conversation last message in lists
    const convs = get().conversations.map((c) => {
      if (c.id === convId) {
        return {
          ...c,
          lastMessage: {
            content: options.type === 'location' ? '📍 Shared Location' : options.type === 'image' ? '📷 Shared Photo' : content,
            senderId,
            createdAt: new Date(),
            type: options.type || 'text',
          },
          updatedAt: new Date(),
        };
      }
      return c;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    set({ activeMessages: activeMsgs, conversations: convs });

    // Transition status to "sent" after 300ms
    setTimeout(() => {
      const msgs = { ...get().activeMessages };
      msgs[convId] = (msgs[convId] || []).map((m) => {
        if (m.id === userMsg.id) {
          return { ...m, status: 'sent' };
        }
        return m;
      });
      set({ activeMessages: msgs });
    }, 400);

    // Trigger typing indicator and mock response from store operator/attendant
    setTimeout(() => {
      // Set Typing state: true
      const typing = { ...get().typingStates };
      typing[convId] = true;
      set({ typingStates: typing });
    }, 900);

    setTimeout(() => {
      // Set Typing state: false
      const typing = { ...get().typingStates };
      typing[convId] = false;

      // Append mock reply message
      const msgs = { ...get().activeMessages };
      const replies = msgs[convId] || [];
      const storePartnerId = convId.replace('conv_', '');
      
      const replyContent = messageService.getAutoReply(convId, content);
      
      const replyMsg: Message = {
        id: `msg_reply_${Date.now()}`,
        conversationId: convId,
        senderId: storePartnerId,
        content: replyContent,
        type: 'text',
        status: 'read',
        createdAt: new Date(),
      };

      msgs[convId] = [...replies, replyMsg];

      // Update conversation last message in list
      const updatedConvs = get().conversations.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            lastMessage: {
              content: replyContent,
              senderId: storePartnerId,
              createdAt: new Date(),
              type: 'text' as const,
            },
            updatedAt: new Date(),
          };
        }
        return c;
      }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      set({ 
        typingStates: typing, 
        activeMessages: msgs,
        conversations: updatedConvs 
      });
    }, 2400);
  },

  markAsRead: (convId, userId) => {
    const unreads = { ...get().unreadCounts };
    unreads[convId] = 0;
    set({ unreadCounts: unreads });
  },
}));
