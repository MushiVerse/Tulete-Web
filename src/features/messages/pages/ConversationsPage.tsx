import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessageStore } from '../hooks/useMessageRealtime';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { Badge } from '../../../shared/components/ui/Badge';
import { 
  Search, MessageSquare, ShieldCheck, Clock, 
  ChevronRight, Phone, MessageCircle, AlertCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';

export const ConversationsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'providers' | 'support'>('all');

  const { conversations, initialize, selectConversation } = useMessageStore();

  // Initialize store with mock current user ID
  useEffect(() => {
    initialize('user_current');
  }, [initialize]);

  // Filter conversations
  const filteredConversations = conversations
    .filter((conv) => {
      // Find other participant detail
      const otherId = conv.participants.find(id => id !== 'user_current') || '';
      const partner = conv.participantDetails[otherId];
      if (!partner) return false;

      // Filter tabs
      if (activeFilterTab === 'support' && otherId !== 'tulete_support') return false;
      if (activeFilterTab === 'providers' && otherId === 'tulete_support') return false;

      // Search matching partner name or last message text
      const nameMatch = partner.name.toLowerCase().includes(searchQuery.toLowerCase());
      const msgMatch = conv.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      
      return nameMatch || msgMatch;
    });

  const getPartnerDetails = (conv: any) => {
    const otherId = conv.participants.find((id: string) => id !== 'user_current') || '';
    return {
      partnerId: otherId,
      partner: conv.participantDetails[otherId] || { name: 'Support', avatarUrl: '' }
    };
  };

  return (
    <PageWrapper className="py-6 px-4 max-w-4xl mx-auto flex flex-col min-h-[85vh]">
      {/* Title Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
            In-App Messaging
          </span>
          <h1 className="text-2xl font-extrabold text-foreground mt-3">
            Messages & Provider Chat
          </h1>
        </div>
      </div>

      {/* Search Input */}
      <div className="sticky top-0 z-20 mb-6 py-2 -mx-2 px-2 bg-background/80 backdrop-blur-xl">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversation thread or attendant..."
            className="pl-10 py-5 bg-card/75 dark:bg-card/60 backdrop-blur-xl border-border/80 rounded-2xl shadow-md"
          />
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-border gap-6 mb-6 overflow-x-auto scrollbar-none">
        {(['all', 'providers', 'support'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilterTab(tab)}
            className={`pb-3 font-bold text-xs uppercase tracking-wider relative transition-all whitespace-nowrap ${
              activeFilterTab === tab 
                ? 'text-primary' 
                : 'text-slate-400 hover:text-slate-650'
            }`}
          >
            {tab === 'all' ? 'All Threads' : tab === 'providers' ? 'Shops & Attendants' : 'Concierge Support'}
            {activeFilterTab === tab && (
              <motion.div 
                layoutId="convTabIndicator" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Chats Threads List */}
      {filteredConversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center bg-muted/40 border border-border/80 rounded-2xl">
          <MessageSquare className="w-12 h-12 text-slate-350 mx-auto mb-4" />
          <h3 className="text-base font-bold mb-1 text-foreground">No Chats Found</h3>
          <p className="text-muted-foreground text-xs max-w-sm mx-auto">
            You don't have any message threads matching this tab or search query.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredConversations.map((conv) => {
            const { partnerId, partner } = getPartnerDetails(conv);
            const userUnread = conv.unreadCounts['user_current'] || 0;

            return (
              <motion.div
                key={conv.id}
                onClick={() => {
                  selectConversation(conv.id);
                  navigate(`/messages/chat/${conv.id}`);
                }}
                whileHover={{ y: -1 }}
                className="cursor-pointer group"
              >
                <Card className={`p-4 border shadow-sm transition-all hover:shadow-md flex items-center gap-4 bg-card ${
                  userUnread > 0 
                    ? 'border-primary bg-primary/5 dark:bg-primary/5' 
                    : 'border-border'
                }`}>
                  {/* User Profile Avatar with Presence status indicator */}
                  <div className="relative flex-shrink-0">
                    <img 
                      src={partner.avatarUrl} 
                      alt={partner.name} 
                      className="w-12 h-12 rounded-full object-cover bg-slate-50 border border-slate-100"
                    />
                    {partner.isOnline && (
                      <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                    )}
                  </div>

                  {/* Body preview details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {partner.name}
                        </h4>
                        {partnerId === 'tulete_support' && (
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />
                        )}
                      </div>
                      
                      <span className="text-[10px] text-slate-400 font-medium">
                        {conv.lastMessage 
                          ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''
                        }
                      </span>
                    </div>

                    <p className={`text-xs truncate ${userUnread > 0 ? 'font-bold text-slate-950 dark:text-white' : 'text-muted-foreground'}`}>
                      {conv.lastMessage?.content || 'No messages yet.'}
                    </p>
                  </div>

                  {/* Right side indicators */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {userUnread > 0 ? (
                      <Badge className="bg-primary text-white text-[10px] font-extrabold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                        {userUnread}
                      </Badge>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-355 dark:text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
};
