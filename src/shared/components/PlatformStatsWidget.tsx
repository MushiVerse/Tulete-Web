import React, { useState, useEffect } from 'react';
import { Store, Star, Clock, Bell } from 'lucide-react';
import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../../core/firebase/config';

export const PlatformStatsWidget: React.FC = () => {
  const [providerCount, setProviderCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStoreCount = async () => {
      try {
        const snap = await getCountFromServer(collection(db, 'foodStores'));
        if (isMounted) {
          setProviderCount(snap.data().count);
        }
      } catch (err) {
        try {
          const snap = await getDocs(collection(db, 'foodStores'));
          if (isMounted) {
            setProviderCount(snap.size);
          }
        } catch (e) {
          // ignore
        }
      }
    };

    fetchStoreCount();
    return () => { isMounted = false; };
  }, []);

  const stats = [
    {
      value: providerCount !== null ? `${providerCount}+` : '...',
      label: 'Providers',
      icon: Store,
    },
    { value: '4.8⭐', label: 'Avg Rating', icon: Star },
    { value: '25min', label: 'Avg Delivery', icon: Clock },
    { value: '24/7', label: 'Support', icon: Bell },
  ];

  return (
    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
      <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider text-foreground">
        Platform Stats
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {stats.map(({ value, label, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-lg font-extrabold leading-tight text-foreground">
                {value}
              </span>
              <span className="block text-[10px] text-muted-foreground font-semibold uppercase">
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
