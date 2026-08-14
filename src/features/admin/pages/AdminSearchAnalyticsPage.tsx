import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { Search, Download, Hash, Flame, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAdminTheme } from '../context/AdminThemeContext';
import { AdminPagination } from '../components/AdminPagination';

export const AdminSearchAnalyticsPage: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';

  const [searches, setSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [contextFilter, setContextFilter] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setLoading(true);
    const searchesRef = collection(db, 'analytics_searches');
    const q = query(searchesRef, limit(200));

    const unsubscribe = onSnapshot(searchesRef, (snap) => {
      const list: any[] = [];
      snap.docs.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });

      list.sort((a, b) => (b.searchCount || 0) - (a.searchCount || 0));
      setSearches(list);
      setLoading(false);
    }, (err) => {
      console.warn('Searches snap error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredSearches = searches.filter((item) => {
    if (contextFilter !== 'all') {
      const ctx = String(item.context || '').toLowerCase();
      if (!ctx.includes(contextFilter.toLowerCase())) return false;
    }
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase().trim();
    const queryStr = String(item.query || item.id || '').toLowerCase();
    return queryStr.includes(q);
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery, contextFilter]);

  const totalPages = Math.ceil(filteredSearches.length / pageSize) || 1;
  const paginatedSearches = filteredSearches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalSearchesRecorded = searches.reduce((acc, curr) => acc + (curr.searchCount || 0), 0);
  const uniqueTermsCount = searches.length;

  const exportCSV = () => {
    if (searches.length === 0) return;
    const headers = ['Query Keyword', 'Search Count', 'Context', 'Unique UIDs Count', 'Last Searched At'];
    const rows = searches.map((s) => [
      `"${s.query || s.id}"`,
      s.searchCount || 1,
      `"${s.context || 'general'}"`,
      s.uids ? (Array.isArray(s.uids) ? s.uids.length : 1) : 0,
      `"${s.lastSearchedAt?.toDate?.() ? s.lastSearchedAt.toDate().toISOString() : ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tulete_Search_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cardBg = isDark ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border shadow-xl ${cardBg}`}>
        <div>
          <div className="flex items-center gap-2 text-purple-500 font-bold text-xs uppercase tracking-wider mb-1">
            <Search className="w-4 h-4" />
            <span>Customer Demand Intelligence</span>
          </div>
          <h1 className={`text-2xl font-black ${textPrimary}`}>Search Query Analytics</h1>
          <p className={`text-xs font-medium mt-1 ${textMuted}`}>
            Analyze customer search terms to identify top demands, trending items, and missing search queries.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={searches.length === 0}
          className="h-11 px-5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20 shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border shadow-md flex items-center justify-between ${cardBg}`}>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>{uniqueTermsCount.toLocaleString()}</p>
            <p className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Unique Search Keywords
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-md flex items-center justify-between ${cardBg}`}>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>{totalSearchesRecorded.toLocaleString()}</p>
            <p className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Total Search Executions
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center">
            <Hash className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-md flex items-center justify-between ${cardBg}`}>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>
              {searches[0]?.query || searches[0]?.id || 'None'}
            </p>
            <p className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              #1 Ranked Search Query
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter search queries..."
            className={`w-full h-11 pl-11 pr-4 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500 transition-all ${inputBg}`}
          />
        </div>

        <select
          value={contextFilter}
          onChange={(e) => setContextFilter(e.target.value)}
          className={`h-11 px-4 rounded-xl text-xs font-extrabold focus:outline-none focus:border-purple-500 ${inputBg}`}
        >
          <option value="all">All Contexts</option>
          <option value="home_page">Home Page</option>
          <option value="food_page">Food Page</option>
          <option value="products_page">Products Page</option>
        </select>
      </div>

      {/* Search Ranking Table */}
      <div className={`border rounded-3xl shadow-xl overflow-hidden ${cardBg}`}>
        <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <h2 className={`text-lg font-black ${textPrimary}`}>Search Keywords Ranking Leaderboard</h2>
          <span className={`text-xs font-bold ${textMuted}`}>
            Showing {filteredSearches.length} terms
          </span>
        </div>

        {loading ? (
          <div className={`p-12 text-center text-xs font-semibold ${textMuted}`}>
            Loading search intelligence data from Firestore...
          </div>
        ) : filteredSearches.length === 0 ? (
          <div className={`p-12 text-center text-xs font-semibold ${textMuted}`}>
            No search query records matching the filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                  isDark ? 'border-slate-800 bg-slate-950/50 text-slate-400' : 'border-slate-200 bg-slate-100/70 text-slate-600'
                }`}>
                  <th className="py-3.5 px-6">Rank</th>
                  <th className="py-3.5 px-6">Search Query</th>
                  <th className="py-3.5 px-6 text-center">Search Count</th>
                  <th className="py-3.5 px-6">Context</th>
                  <th className="py-3.5 px-6 text-center">Unique Users</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-medium ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {paginatedSearches.map((item, idx) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + idx + 1;
                  const uidsCount = item.uids ? (Array.isArray(item.uids) ? item.uids.length : 1) : 0;
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.015 }}
                      className={isDark ? 'hover:bg-slate-800/40 transition-colors' : 'hover:bg-slate-50 transition-colors'}
                    >
                      <td className={`py-4 px-6 font-black ${textMuted}`}>
                        #{absoluteIndex}
                      </td>
                      <td className={`py-4 px-6 font-bold ${textPrimary}`}>
                        <span className={`px-2.5 py-1 rounded-lg font-mono text-xs border ${
                          isDark ? 'bg-slate-800 text-purple-300 border-slate-700/60' : 'bg-slate-100 text-purple-700 border-slate-300'
                        }`}>
                          "{item.query || item.id}"
                        </span>
                      </td>
                      <td className={`py-4 px-6 text-center font-black ${textPrimary}`}>
                        <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 font-bold border border-purple-500/20">
                          {item.searchCount || 1}
                        </span>
                      </td>
                      <td className={`py-4 px-6 font-semibold ${textMuted}`}>
                        <span className={`px-2.5 py-1 rounded-md text-[11px] ${
                          isDark ? 'bg-slate-800/60 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.context || 'general'}
                        </span>
                      </td>
                      <td className={`py-4 px-6 text-center font-bold ${textPrimary}`}>
                        {uidsCount}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredSearches.length}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => setPageSize(size)}
        />
      </div>
    </div>
  );
};
