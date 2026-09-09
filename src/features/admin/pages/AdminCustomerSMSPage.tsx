import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, Users, CheckCircle2, AlertCircle, Phone, MapPin, Building2, 
  Sparkles, Copy, Check, RefreshCw, Search, Filter, Clock, Smartphone, 
  FileText, Trash2, History, Eye, ListChecks, UserCheck, MessageSquare, 
  ChevronDown, ArrowRight, ShieldCheck, Info, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminTheme } from '../context/AdminThemeContext';
import { AdminPagination } from '../components/AdminPagination';
import { 
  adminSmsService, 
  Customer, 
  SMSCampaignLog, 
  calculateSMSSegments, 
  formatTanzanianPhone 
} from '../services/adminSmsService';

export const AdminCustomerSMSPage: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';

  // Customers State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  
  // Audience Mode: 'all' | 'filtered' | 'manual'
  const [audienceMode, setAudienceMode] = useState<'all' | 'filtered' | 'manual'>('all');
  const [manualPhoneInput, setManualPhoneInput] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // SMS Composer State
  const [messageText, setMessageText] = useState('');
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // Modal / Action States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState({ sent: 0, total: 0, batch: 0, totalBatches: 0 });
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    totalSent: number;
    totalFailed: number;
    campaignId?: string;
  } | null>(null);

  // History Tab / State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [campaignHistory, setCampaignHistory] = useState<SMSCampaignLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Preset Templates
  const templates = [
    {
      title: '🧺 Pick-up Ready',
      tag: 'Laundry',
      text: 'Ndugu {name}, nguo zako zipo tayari kuchukuliwa katika ofisi yetu ya {office}. Karibu sana Tulete Dobi!',
    },
    {
      title: '🎉 Special Promo',
      tag: 'Marketing',
      text: 'Habari {name}! Pata punguzo maalum la 15% kwa nguo zako wiki hii Tulete Dobi. Tunakusanya na kukuletea hadi kwako!',
    },
    {
      title: '🚚 Order In Transit',
      tag: 'Delivery',
      text: 'Ndugu {name}, oda yako ipo njiani kuletwa kwako. Dereva wetu atakupigia akikaribia. Asante kwa kuchagua Tulete!',
    },
    {
      title: '📢 Holiday Notice',
      tag: 'Announcement',
      text: 'Wateja wetu wapendwa, ofisi zetu za Tulete zitakuwa wazi sikukuu hii kuanzia saa 2:00 asubuhi. Karibuni sana!',
    },
    {
      title: '⭐ Quality Feedback',
      tag: 'Feedback',
      text: 'Habari {name}, tunashukuru kwa kutumia huduma ya Tulete Dobi. Je, uliridhika na usafi wa nguo zako? Tupe maoni yako.',
    },
  ];

  // Subscribe to real-time customers collection from Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = adminSmsService.subscribeCustomers(
      (data) => {
        setCustomers(data);
        setIsLoading(false);
      },
      (err) => {
        console.error(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Unique branches from customers
  const branchList = useMemo(() => {
    const branches = new Set<string>();
    customers.forEach((c) => {
      if (c.officeAttended && c.officeAttended.trim() && c.officeAttended !== 'Main') {
        branches.add(c.officeAttended.trim());
      }
    });
    return Array.from(branches).sort();
  }, [customers]);

  // Filtered customers based on search and branch
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      // Branch filter
      if (selectedBranch !== 'all') {
        const branch = (customer.officeAttended || '').toLowerCase();
        if (!branch.includes(selectedBranch.toLowerCase())) {
          return false;
        }
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = customer.name.toLowerCase();
      const phone = customer.phone.toLowerCase();
      const formattedPhone = customer.formattedPhone.toLowerCase();
      const address = (customer.address || '').toLowerCase();
      const office = (customer.officeAttended || '').toLowerCase();

      return name.includes(q) || phone.includes(q) || formattedPhone.includes(q) || address.includes(q) || office.includes(q);
    });
  }, [customers, selectedBranch, searchQuery]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBranch, audienceMode]);

  // Parse manual phone numbers
  const manualRecipients = useMemo(() => {
    if (audienceMode !== 'manual' || !manualPhoneInput.trim()) return [];
    const entries = manualPhoneInput
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    return entries.map((raw, index) => {
      const { formatted, isValid } = formatTanzanianPhone(raw);
      return {
        id: `manual-${index}`,
        name: `Customer ${index + 1}`,
        phone: raw,
        formattedPhone: formatted,
        isValidPhone: isValid,
        officeAttended: 'Manual Entry',
        address: 'Direct Input',
      } as Customer;
    });
  }, [audienceMode, manualPhoneInput]);

  // Effective target recipients based on active mode
  const effectiveRecipients = useMemo(() => {
    if (audienceMode === 'all') {
      if (selectedBranch !== 'all') {
        return filteredCustomers.filter((c) => c.isValidPhone);
      }
      return customers.filter((c) => c.isValidPhone);
    } else if (audienceMode === 'manual') {
      return manualRecipients.filter((c) => c.isValidPhone);
    } else {
      // 'filtered' mode: only explicitly checked customers
      return customers.filter((c) => selectedCustomerIds.has(c.id) && c.isValidPhone);
    }
  }, [audienceMode, selectedBranch, filteredCustomers, customers, selectedCustomerIds, manualRecipients]);

  // SMS metrics calculation
  const smsSegments = useMemo(() => {
    return calculateSMSSegments(messageText);
  }, [messageText]);

  const totalCreditsEstimated = useMemo(() => {
    return effectiveRecipients.length * (smsSegments.segments || 1);
  }, [effectiveRecipients.length, smsSegments.segments]);

  // Pagination for the customer table
  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Checkbox selection handlers
  const handleToggleCustomer = (id: string) => {
    const updated = new Set(selectedCustomerIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedCustomerIds(updated);
  };

  const handleSelectAllFiltered = () => {
    const updated = new Set(selectedCustomerIds);
    filteredCustomers.forEach((c) => {
      if (c.isValidPhone) updated.add(c.id);
    });
    setSelectedCustomerIds(updated);
    setAudienceMode('filtered');
  };

  const handleClearSelection = () => {
    setSelectedCustomerIds(new Set());
  };

  const handleSelectPage = () => {
    const updated = new Set(selectedCustomerIds);
    paginatedCustomers.forEach((c) => {
      if (c.isValidPhone) updated.add(c.id);
    });
    setSelectedCustomerIds(updated);
    setAudienceMode('filtered');
  };

  const handleCopyPhone = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    setMessageText((prev) => prev + placeholder);
  };

  // Preview sample calculation
  const sampleCustomer = useMemo(() => {
    if (effectiveRecipients.length > 0) return effectiveRecipients[0];
    if (customers.length > 0) return customers[0];
    return { name: 'Juma Khamis', officeAttended: 'Mlimani City', address: 'Mwenge, Dar es Salaam' } as Customer;
  }, [effectiveRecipients, customers]);

  const previewMessage = useMemo(() => {
    if (!messageText) return 'Andika ujumbe wako hapa kuona jinsi utakavyoonekana kwenye simu ya mteja...';
    return messageText
      .replace(/\{name\}/gi, sampleCustomer?.name || 'Mteja')
      .replace(/\{office\}/gi, sampleCustomer?.officeAttended || 'Tulete Dobi')
      .replace(/\{address\}/gi, sampleCustomer?.address || 'Dar es Salaam');
  }, [messageText, sampleCustomer]);

  // Trigger Send Broadcast
  const handleInitiateBroadcast = () => {
    if (effectiveRecipients.length === 0) {
      alert('Tafadhali chagua angalau namba 1 halali ya mteja kutuma ujumbe.');
      return;
    }
    if (!messageText.trim()) {
      alert('Tafadhali andika ujumbe kabla ya kutuma.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleExecuteBroadcast = async () => {
    setShowConfirmModal(false);
    setIsSending(true);
    setSendingProgress({ sent: 0, total: effectiveRecipients.length, batch: 0, totalBatches: 0 });

    try {
      const result = await adminSmsService.broadcastSMS({
        messageTemplate: messageText.trim(),
        recipients: effectiveRecipients,
        targetType: audienceMode,
        branchFilter: selectedBranch !== 'all' ? selectedBranch : undefined,
        onProgress: (sent, total, batch, totalBatches) => {
          setSendingProgress({ sent, total, batch, totalBatches });
        },
      });

      setSendResult({
        success: result.success,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
        campaignId: result.campaignId,
      });
    } catch (e: any) {
      alert(`Imeshindwa kutuma SMS: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Load history
  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    setIsLoadingHistory(true);
    try {
      const logs = await adminSmsService.fetchCampaignHistory(30);
      setCampaignHistory(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Quick stats
  const totalCustomersCount = customers.length;
  const validPhonesCount = customers.filter((c) => c.isValidPhone).length;
  const validPercentage = totalCustomersCount > 0 ? ((validPhonesCount / totalCustomersCount) * 100).toFixed(0) : '0';

  // Common UI styles
  const cardBg = isDark ? 'bg-zinc-900/80 border-zinc-800/80 backdrop-blur-xl' : 'bg-white border-slate-200/80 shadow-xs';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Top Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-md shadow-amber-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>
                Customer SMS Broadcasting
              </h1>
              <p className={`text-xs sm:text-sm font-medium ${textMuted}`}>
                Send bulk and targeted SMS to Firestore customers via the KilaKona gateway
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenHistory}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
              isDark 
                ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-zinc-200' 
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-xs'
            }`}
          >
            <History className="w-4 h-4 text-amber-500" />
            <span>Campaign History</span>
          </button>

          <button
            onClick={async () => {
              setIsLoading(true);
              try {
                const refreshed = await adminSmsService.fetchCustomers();
                setCustomers(refreshed);
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
              isDark 
                ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300' 
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
            }`}
            title="Refresh Customer List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Customers */}
        <div className={`p-4 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textMuted}`}>Total in Firestore</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${textPrimary}`}>{totalCustomersCount.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-blue-500">records</span>
          </div>
          <p className={`text-[11px] mt-1 font-medium ${textMuted}`}>Collection: <code className="text-amber-500 font-mono">customers</code></p>
        </div>

        {/* Valid Tanzanian Numbers */}
        <div className={`p-4 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textMuted}`}>Valid SMS Numbers</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black text-emerald-500`}>{validPhonesCount.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">({validPercentage}%)</span>
          </div>
          <p className={`text-[11px] mt-1 font-medium ${textMuted}`}>Standard: 255XXXXXXXXX</p>
        </div>

        {/* Target Audience Count */}
        <div className={`p-4 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textMuted}`}>Current Target</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Phone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black text-amber-500`}>{effectiveRecipients.length.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-zinc-400">recipients</span>
          </div>
          <p className={`text-[11px] mt-1 font-medium ${textMuted}`}>
            Mode: <strong className={textPrimary}>{audienceMode.toUpperCase()}</strong>
          </p>
        </div>

        {/* SMS Credits Calculation */}
        <div className={`p-4 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textMuted}`}>Est. SMS Credits</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black text-purple-500`}>{totalCreditsEstimated.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-purple-400">credits</span>
          </div>
          <p className={`text-[11px] mt-1 font-medium ${textMuted}`}>
            {smsSegments.segments} SMS parts per contact
          </p>
        </div>
      </div>

      {/* Main Content Layout: Two-Column (Left: Customer Selector, Right: SMS Composer & Live Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Target Audience & Customer Directory (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
            {/* Audience Mode Switcher Tabs */}
            <div className={`p-3 sm:p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
              isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-slate-200 bg-slate-50/50'
            }`}>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-800/40 border border-zinc-700/50">
                <button
                  onClick={() => setAudienceMode('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    audienceMode === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Customers ({customers.filter((c) => c.isValidPhone).length})
                </button>
                <button
                  onClick={() => setAudienceMode('filtered')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    audienceMode === 'filtered'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Selected ({selectedCustomerIds.size})
                </button>
                <button
                  onClick={() => setAudienceMode('manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    audienceMode === 'manual'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Manual Input
                </button>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className={`text-xs font-bold ${textPrimary}`}>
                  {effectiveRecipients.length.toLocaleString()} Ready to Receive
                </span>
              </div>
            </div>

            {/* If in Manual Mode: Textarea for pasting numbers */}
            {audienceMode === 'manual' ? (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-extrabold uppercase tracking-wider ${textPrimary}`}>
                    Paste Phone Numbers (Comma or Newline Separated)
                  </label>
                  <span className={`text-xs font-medium ${textMuted}`}>
                    Format: 07XXXXXXXX or 255XXXXXXXXX
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={manualPhoneInput}
                  onChange={(e) => setManualPhoneInput(e.target.value)}
                  placeholder="0757449734&#10;0764587748&#10;255712345678"
                  className={`w-full p-3.5 rounded-xl border text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${inputBg}`}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className={textMuted}>
                    Parsed: <strong className={textPrimary}>{manualRecipients.length}</strong> numbers | Valid:{' '}
                    <strong className="text-emerald-500">{manualRecipients.filter((r) => r.isValidPhone).length}</strong>
                  </span>
                  <button
                    onClick={() => setManualPhoneInput('')}
                    className="text-red-500 hover:underline font-bold"
                  >
                    Clear Input
                  </button>
                </div>
              </div>
            ) : (
              /* If in 'all' or 'filtered' mode: Table with search, filters, selection */
              <div>
                {/* Search & Branch Filter Bar */}
                <div className="p-3 sm:p-4 border-b grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7 relative">
                    <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${textMuted}`} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, phone, branch, address..."
                      className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${inputBg}`}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-zinc-800 text-zinc-400`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="sm:col-span-5 flex items-center gap-2">
                    <Filter className={`w-4 h-4 shrink-0 ${textMuted}`} />
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className={`w-full py-2 px-3 rounded-xl border text-xs font-extrabold focus:outline-none ${
                        isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="all">All Branches ({customers.length})</option>
                      {branchList.map((branch) => {
                        const count = customers.filter((c) => c.officeAttended === branch).length;
                        return (
                          <option key={branch} value={branch}>
                            {branch} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Quick Selection Toolbar */}
                <div className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
                  isDark ? 'bg-zinc-950/20 border-zinc-800' : 'bg-slate-100/60 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAllFiltered}
                      className="font-bold text-amber-500 hover:underline cursor-pointer"
                    >
                      Select All Filtered ({filteredCustomers.length})
                    </button>
                    <span className={textMuted}>•</span>
                    <button
                      onClick={handleSelectPage}
                      className={`font-bold hover:underline cursor-pointer ${textMuted}`}
                    >
                      Select Current Page ({paginatedCustomers.length})
                    </button>
                    {selectedCustomerIds.size > 0 && (
                      <>
                        <span className={textMuted}>•</span>
                        <button
                          onClick={handleClearSelection}
                          className="font-bold text-red-500 hover:underline cursor-pointer"
                        >
                          Clear Selection ({selectedCustomerIds.size})
                        </button>
                      </>
                    )}
                  </div>

                  <span className={`font-semibold ${textMuted}`}>
                    {selectedCustomerIds.size} of {customers.length} selected
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className={`sticky top-0 z-10 uppercase tracking-wider font-extrabold text-[10px] ${
                      isDark ? 'bg-zinc-900 text-zinc-400 border-b border-zinc-800' : 'bg-slate-100 text-slate-600 border-b border-slate-200'
                    }`}>
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              paginatedCustomers.length > 0 &&
                              paginatedCustomers.every((c) => selectedCustomerIds.has(c.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleSelectPage();
                              } else {
                                const updated = new Set(selectedCustomerIds);
                                paginatedCustomers.forEach((c) => updated.delete(c.id));
                                setSelectedCustomerIds(updated);
                              }
                            }}
                            className="rounded border-zinc-600 text-amber-500 focus:ring-amber-500 cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Phone Number</th>
                        <th className="p-3">Office / Branch</th>
                        <th className="p-3">Location</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-200/80'}`}>
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                            <p className={textMuted}>Loading customers from Firestore...</p>
                          </td>
                        </tr>
                      ) : paginatedCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center">
                            <p className={`font-bold ${textPrimary}`}>No customers match your criteria.</p>
                            <p className={`text-xs mt-1 ${textMuted}`}>Try adjusting your search query or branch filter.</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedCustomers.map((customer) => {
                          const isSelected = selectedCustomerIds.has(customer.id);

                          return (
                            <tr
                              key={customer.id}
                              onClick={() => {
                                handleToggleCustomer(customer.id);
                                if (audienceMode === 'all') setAudienceMode('filtered');
                              }}
                              className={`transition-colors cursor-pointer ${
                                isSelected
                                  ? isDark ? 'bg-amber-500/10' : 'bg-amber-50'
                                  : isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    handleToggleCustomer(customer.id);
                                    if (audienceMode === 'all') setAudienceMode('filtered');
                                  }}
                                  className="rounded border-zinc-600 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                    isDark ? 'bg-zinc-800 text-amber-400' : 'bg-slate-200 text-slate-800'
                                  }`}>
                                    {customer.name.charAt(0).toUpperCase() || 'C'}
                                  </div>
                                  <div>
                                    <p className={`font-bold truncate max-w-[140px] sm:max-w-[180px] ${textPrimary}`}>
                                      {customer.name}
                                    </p>
                                    <span className={`text-[10px] font-mono ${textMuted}`}>ID: {customer.id.slice(0, 10)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-mono text-xs font-bold ${customer.isValidPhone ? textPrimary : 'text-red-400 line-through'}`}>
                                    {customer.formattedPhone || customer.phone}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyPhone(customer.id, customer.formattedPhone || customer.phone);
                                    }}
                                    className={`p-1 rounded hover:bg-zinc-700/50 text-zinc-400 transition-colors cursor-pointer`}
                                    title="Copy Phone"
                                  >
                                    {copiedPhoneId === customer.id ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                  {customer.isValidPhone ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/10 text-emerald-500">
                                      255
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-500/10 text-red-500">
                                      Invalid
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  <Building2 className="w-3 h-3 text-amber-500" />
                                  {customer.officeAttended || 'Main'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`truncate max-w-[120px] inline-block ${textMuted}`} title={customer.address}>
                                  {customer.address || '—'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <AdminPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredCustomers.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: SMS Composer + Preset Templates + Mobile Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* SMS Composer Box */}
          <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <h3 className={`text-sm font-extrabold ${textPrimary}`}>SMS Message Composer</h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Sender: TULETE
              </span>
            </div>

            {/* Quick Templates Selector */}
            <div className="space-y-1.5">
              <span className={`text-[11px] font-bold ${textMuted}`}>Quick Message Templates:</span>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((tmpl) => (
                  <button
                    key={tmpl.title}
                    onClick={() => setMessageText(tmpl.text)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      isDark
                        ? 'bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Variable Placeholders */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${textMuted}`}>Dynamic Placeholders:</span>
                <span className={`text-[10px] font-medium ${textMuted}`}>Click to insert into message</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleInsertPlaceholder('{name}')}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 cursor-pointer"
                >
                  +{'{name}'} (Customer Name)
                </button>
                <button
                  onClick={() => handleInsertPlaceholder('{office}')}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 cursor-pointer"
                >
                  +{'{office}'} (Office/Branch)
                </button>
                <button
                  onClick={() => handleInsertPlaceholder('{address}')}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer"
                >
                  +{'{address}'} (Location)
                </button>
              </div>
            </div>

            {/* Textarea Input */}
            <div className="space-y-2">
              <textarea
                rows={5}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Andika ujumbe wako hapa..."
                className={`w-full p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${inputBg}`}
              />

              {/* Character & Segment Count */}
              <div className="flex items-center justify-between text-[11px]">
                <span className={`font-mono font-bold ${
                  smsSegments.charCount > 160 ? 'text-amber-500' : textMuted
                }`}>
                  {smsSegments.charCount} chars • {smsSegments.segments || 1} SMS {smsSegments.segments > 1 ? 'parts' : 'part'}
                </span>
                {messageText && (
                  <button
                    onClick={() => setMessageText('')}
                    className="text-red-500 hover:underline font-bold cursor-pointer"
                  >
                    Clear Text
                  </button>
                )}
              </div>
            </div>

            {/* Target Audience Summary Pill */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <span className={textMuted}>Target:</span>
                <strong className={textPrimary}>{effectiveRecipients.length} recipients</strong>
              </div>
              <span className="font-extrabold text-amber-500">
                ~{totalCreditsEstimated} Total SMS Credits
              </span>
            </div>

            {/* Broadcast Action Button */}
            <button
              onClick={handleInitiateBroadcast}
              disabled={effectiveRecipients.length === 0 || !messageText.trim() || isSending}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm text-slate-950 flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-amber-500/20 ${
                effectiveRecipients.length === 0 || !messageText.trim() || isSending
                  ? 'bg-zinc-700 text-zinc-400 opacity-60 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Broadcast SMS via KilaKona</span>
            </button>
          </div>

          {/* Interactive Live Smartphone Mockup Preview */}
          <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-500" />
                <h4 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                  Live Customer Mobile Preview
                </h4>
              </div>
              <span className={`text-[10px] font-medium ${textMuted}`}>
                Showing for: <strong className="text-amber-500">{sampleCustomer?.name || 'Sample'}</strong>
              </span>
            </div>

            {/* Realistic Phone Container */}
            <div className="mx-auto max-w-[320px] rounded-[32px] border-4 border-zinc-800 bg-zinc-950 p-3 shadow-2xl shadow-black/60">
              {/* Phone Speaker Notch */}
              <div className="mx-auto w-24 h-4 rounded-full bg-zinc-900 mb-2 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-zinc-950/80 mr-2" />
                <div className="w-8 h-1 rounded-full bg-zinc-800" />
              </div>

              {/* Chat Header */}
              <div className="p-2.5 border-b border-zinc-800/80 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xs">
                    T
                  </div>
                  <div>
                    <p className="font-extrabold text-xs">TULETE</p>
                    <p className="text-[9px] text-emerald-400 font-semibold">SMS Verified Gateway</p>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">Today</span>
              </div>

              {/* Chat Body */}
              <div className="py-5 px-1 min-h-[140px] flex flex-col justify-end space-y-2">
                <div className="text-center text-[10px] text-zinc-500 font-semibold mb-1">
                  Today • 12:45 PM
                </div>

                <div className="max-w-[90%] p-3 rounded-2xl rounded-tl-sm bg-zinc-800/90 text-zinc-100 text-xs leading-relaxed shadow-md border border-zinc-700/40">
                  <p className="whitespace-pre-wrap">{previewMessage}</p>
                  <div className="mt-1.5 flex items-center justify-end gap-1 text-[9px] text-zinc-400">
                    <span>Delivered</span>
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Phone Home Bar */}
              <div className="mx-auto w-20 h-1 rounded-full bg-zinc-800 mt-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl space-y-5 ${cardBg}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black ${textPrimary}`}>Confirm SMS Broadcast</h3>
                    <p className={`text-xs ${textMuted}`}>Please verify the campaign details before triggering SMS gateway</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between text-xs">
                  <span className={textMuted}>Target Recipients:</span>
                  <strong className={textPrimary}>{effectiveRecipients.length.toLocaleString()} customers</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={textMuted}>Audience Mode:</span>
                  <strong className="text-amber-500 font-bold uppercase">{audienceMode}</strong>
                </div>
                {selectedBranch !== 'all' && (
                  <div className="flex justify-between text-xs">
                    <span className={textMuted}>Branch Filter:</span>
                    <strong className={textPrimary}>{selectedBranch}</strong>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className={textMuted}>SMS Parts per Contact:</span>
                  <strong className={textPrimary}>{smsSegments.segments} SMS ({smsSegments.charCount} chars)</strong>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-zinc-800">
                  <span className={textMuted}>Estimated SMS Credits:</span>
                  <strong className="text-amber-500 font-black text-sm">{totalCreditsEstimated.toLocaleString()} Credits</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className={`text-[11px] font-bold ${textMuted}`}>Sample Message Body:</span>
                <div className={`p-3 rounded-xl border text-xs font-mono whitespace-pre-wrap ${isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-white border-slate-200 text-slate-800'}`}>
                  {previewMessage}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteBroadcast}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Confirm & Send Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sending Progress / Result Modal */}
      <AnimatePresence>
        {(isSending || sendResult) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-6 text-center ${cardBg}`}
            >
              {isSending ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse">
                    <Send className="w-8 h-8 animate-bounce" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black ${textPrimary}`}>Broadcasting SMS Campaign</h3>
                    <p className={`text-xs mt-1 ${textMuted}`}>
                      Dispatching to KilaKona SMS Gateway...
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300"
                        style={{
                          width: `${(sendingProgress.sent / (sendingProgress.total || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-mono font-bold text-zinc-400">
                      <span>{sendingProgress.sent} of {sendingProgress.total} contacts</span>
                      <span>Batch {sendingProgress.batch}/{sendingProgress.totalBatches}</span>
                    </div>
                  </div>
                </>
              ) : sendResult ? (
                <>
                  <div className={`mx-auto w-16 h-16 rounded-3xl flex items-center justify-center ${
                    sendResult.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {sendResult.success ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className={`text-lg font-black ${textPrimary}`}>
                      {sendResult.success ? 'Campaign Dispatched Successfully!' : 'Campaign Failed'}
                    </h3>
                    <p className={`text-xs mt-1 ${textMuted}`}>
                      {sendResult.success
                        ? `All ${sendResult.totalSent} messages have been forwarded to KilaKona SMS vendor.`
                        : 'There was an issue dispatching the messages to the SMS vendor.'}
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border text-xs grid grid-cols-2 gap-3 ${
                    isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className={textMuted}>Delivered Contacts:</span>
                      <p className="text-base font-black text-emerald-500">{sendResult.totalSent}</p>
                    </div>
                    <div>
                      <span className={textMuted}>Failed Contacts:</span>
                      <p className="text-base font-black text-red-400">{sendResult.totalFailed}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSendResult(null);
                      setMessageText('');
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    Done & Return to Dashboard
                  </button>
                </>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Campaign History Drawer / Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-2xl max-h-[85vh] rounded-3xl border p-6 shadow-2xl flex flex-col ${cardBg}`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-black ${textPrimary}`}>Recent SMS Campaigns</h3>
                    <p className={`text-xs ${textMuted}`}>Past message broadcasts saved in Firestore</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {isLoadingHistory ? (
                  <div className="py-12 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                    <p className={textMuted}>Loading campaign history...</p>
                  </div>
                ) : campaignHistory.length === 0 ? (
                  <div className="py-12 text-center">
                    <MessageSquare className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                    <p className={`font-bold ${textPrimary}`}>No campaigns sent yet</p>
                    <p className={`text-xs mt-1 ${textMuted}`}>Your sent SMS logs will be saved and displayed here.</p>
                  </div>
                ) : (
                  campaignHistory.map((campaign) => {
                    const dateStr = campaign.createdAt?.toDate
                      ? campaign.createdAt.toDate().toLocaleString()
                      : 'Just now';

                    return (
                      <div
                        key={campaign.id}
                        className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                          isDark ? 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500">
                              {campaign.status}
                            </span>
                            <span className={`font-mono text-[11px] ${textMuted}`}>{dateStr}</span>
                          </div>
                          <span className={`font-extrabold text-xs ${textPrimary}`}>
                            {campaign.recipientCount} Recipients ({campaign.targetType})
                          </span>
                        </div>

                        <p className={`text-xs whitespace-pre-wrap font-mono p-2.5 rounded-xl border ${
                          isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                          {campaign.message}
                        </p>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className={textMuted}>Sent by: <strong>{campaign.sentBy}</strong></span>
                          <button
                            onClick={() => {
                              setMessageText(campaign.message);
                              setShowHistoryModal(false);
                            }}
                            className="text-amber-500 font-bold hover:underline cursor-pointer"
                          >
                            Reuse This Template →
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
