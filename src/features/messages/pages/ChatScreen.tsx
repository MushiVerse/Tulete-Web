import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessageStore } from '../hooks/useMessageRealtime';
import { messageService, Message, MessageType } from '../services/messageService';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { Badge } from '../../../shared/components/ui/Badge';
import { 
  ChevronLeft, Send, Image as ImageIcon, MapPin, 
  ShoppingBag, Store, Phone, Check, CheckCheck, Loader2,
  Paperclip, MoreVertical, ShieldCheck, Smile, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [textInput, setTextInput] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);

  const { 
    conversations, 
    activeMessages, 
    typingStates, 
    initialize, 
    sendMessage,
    selectConversation 
  } = useMessageStore();

  // Initialize store
  useEffect(() => {
    initialize('user_current');
    if (id) {
      selectConversation(id);
    }
  }, [id, initialize, selectConversation]);

  // Find active conversation
  const activeConv = conversations.find((c) => c.id === id);
  const messages = activeMessages[id || ''] || [];
  const isTyping = typingStates[id || ''] || false;

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (!activeConv) {
    return (
      <PageWrapper className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold">Chat Not Found</h2>
        <p className="text-muted-foreground text-xs mt-1 mb-6">This message thread does not exist or has expired.</p>
        <Button onClick={() => navigate('/messages')}>Go to Messages</Button>
      </PageWrapper>
    );
  }

  // Get partner details
  const otherId = activeConv.participants.find((p) => p !== 'user_current') || '';
  const partner = activeConv.participantDetails[otherId] || { name: 'Support', avatarUrl: '', isOnline: false };

  // Send message action
  const handleSend = () => {
    if (!textInput.trim() || !id) return;
    sendMessage(id, 'user_current', textInput.trim());
    setTextInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Mock attachment injections for demonstration
  const injectAttachment = (type: MessageType) => {
    if (!id) return;
    setShowAttachments(false);

    if (type === 'image') {
      sendMessage(id, 'user_current', 'Sent a photo', {
        type: 'image',
        imageUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebd01?w=400',
      });
    } else if (type === 'location') {
      sendMessage(id, 'user_current', 'Sent location details', {
        type: 'location',
        location: { lat: -1.2915, lng: 36.7900, address: 'Wood Avenue, Kilimani, Nairobi' }
      });
    } else if (type === 'order_reference') {
      sendMessage(id, 'user_current', 'Referenced order #TL-40398', {
        type: 'order_reference',
        referenceId: 'order_40398',
        referenceTitle: 'Order #TL-40398'
      });
    } else if (type === 'store_reference') {
      sendMessage(id, 'user_current', 'Referenced Kibanda Delight Store', {
        type: 'store_reference',
        referenceId: 'store_kibanda_delight',
        referenceTitle: 'Kibanda Delight Fast Food'
      });
    }
  };

  return (
    <PageWrapper className="p-0 bg-muted flex flex-col h-[85vh] relative overflow-hidden">
      {/* Dynamic Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/messages')}
            className="p-1 hover:bg-accent rounded-full transition-colors text-slate-550 dark:text-slate-400"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <img 
              src={partner.avatarUrl} 
              alt={partner.name} 
              className="w-10 h-10 rounded-full object-cover border border-slate-200"
            />
            {partner.isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-1">
              <h3 className="font-extrabold text-sm text-foreground line-clamp-1">{partner.name}</h3>
              {otherId === 'tulete_support' && (
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {partner.isOnline ? 'Online' : 'Active recently'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {otherId !== 'tulete_support' && (
            <a 
              href="tel:+254711222333" 
              className="p-2 hover:bg-accent rounded-full transition-colors text-slate-550 dark:text-slate-400"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
          <button className="p-2 hover:bg-accent rounded-full transition-colors text-slate-550 dark:text-slate-400">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages scrolling view */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === 'user_current';

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed relative group shadow-sm transition-all ${
                isMe 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-card border border-slate-100 dark:border-slate-850 text-slate-900 dark:text-slate-200 rounded-tl-none'
              }`}>
                {/* Text Type */}
                {msg.type === 'text' && (
                  <p>{msg.content}</p>
                )}

                {/* Image Type */}
                {msg.type === 'image' && (
                  <div className="space-y-2">
                    <img 
                      src={msg.imageUrl} 
                      alt="Attachment" 
                      className="w-full h-36 object-cover rounded-lg cursor-pointer"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                    <p className="text-[10px] opacity-90">{msg.content}</p>
                  </div>
                )}

                {/* Location Share Type */}
                {msg.type === 'location' && msg.location && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-black/5 p-2 rounded-lg border border-black/5">
                      <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-[11px]">Shared Location</p>
                        <p className="text-[9px] line-clamp-1 opacity-80">{msg.location.address}</p>
                      </div>
                    </div>
                    <a 
                      href={`https://maps.google.com/?q=${msg.location.lat},${msg.location.lng}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] underline font-bold block"
                    >
                      Open Directions
                    </a>
                  </div>
                )}

                {/* Order Reference Type */}
                {msg.type === 'order_reference' && (
                  <Card className="p-3 bg-black/5 dark:bg-slate-850 border-0 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                      <div>
                        <span className="font-bold text-slate-950 dark:text-white">{msg.referenceTitle}</span>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Click to view order details</p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Store Reference Type */}
                {msg.type === 'store_reference' && (
                  <Card className="p-3 bg-black/5 dark:bg-slate-850 border-0 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-primary" />
                      <div>
                        <span className="font-bold text-slate-950 dark:text-white">{msg.referenceTitle}</span>
                        <p className="text-[9px] text-slate-550 mt-0.5">Explore services catalog</p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Subtitle Timestamp & Status Double Checks */}
                <div className="flex items-center justify-end gap-1 mt-1.5 opacity-60 text-[9px]">
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {isMe && (
                    <span className="ml-1">
                      {msg.status === 'sending' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                      {msg.status === 'sent' && <Check className="w-3 h-3" />}
                      {msg.status === 'read' && <CheckCheck className="w-3 h-3 text-sky-400" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicators */}
        <AnimatePresence>
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-start"
            >
              <div className="bg-card border border-slate-100 dark:border-slate-850 text-muted-foreground rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-1.5 text-xs">
                <span>{partner.name} is typing</span>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200" />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Attachment Slider Sheets */}
      <AnimatePresence>
        {showAttachments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-card border-t border-border z-15"
          >
            <div className="grid grid-cols-4 gap-4 p-4 text-center text-xs">
              <button 
                onClick={() => injectAttachment('image')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted hover:bg-slate-100 transition-colors font-semibold"
              >
                <ImageIcon className="w-5 h-5 text-indigo-500 mb-1" />
                Photo
              </button>
              <button 
                onClick={() => injectAttachment('location')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted hover:bg-slate-100 transition-colors font-semibold"
              >
                <MapPin className="w-5 h-5 text-emerald-500 mb-1" />
                Location
              </button>
              <button 
                onClick={() => injectAttachment('order_reference')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted hover:bg-slate-100 transition-colors font-semibold"
              >
                <ShoppingBag className="w-5 h-5 text-amber-500 mb-1" />
                Order Ref
              </button>
              <button 
                onClick={() => injectAttachment('store_reference')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted hover:bg-slate-100 transition-colors font-semibold"
              >
                <Store className="w-5 h-5 text-blue-500 mb-1" />
                Store Ref
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Text Inputs */}
      <div className="bg-card border-t border-border px-4 py-3 flex items-center gap-2 z-10">
        <button 
          onClick={() => setShowAttachments(!showAttachments)}
          className={`p-2 rounded-full transition-colors ${
            showAttachments 
              ? 'bg-primary/10 text-primary' 
              : 'hover:bg-accent text-slate-400'
          }`}
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <Input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type message..."
          className="flex-1 bg-muted border-border h-10 text-xs rounded-full px-4"
        />

        <button className="p-2 hover:bg-accent rounded-full text-slate-400">
          <Smile className="w-4 h-4" />
        </button>

        <Button
          onClick={handleSend}
          className="h-9 w-9 p-0 rounded-full shadow-md shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </PageWrapper>
  );
};
