import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Scissors, Coffee, Laptop, Wrench, Shirt, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const categories = [
  { id: '1', name: 'Retail', icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
  { id: '2', name: 'Salon', icon: Scissors, color: 'bg-pink-100 text-pink-600' },
  { id: '3', name: 'Food', icon: Coffee, color: 'bg-orange-100 text-orange-600' },
  { id: '4', name: 'Tech', icon: Laptop, color: 'bg-purple-100 text-purple-600' },
  { id: '5', name: 'Repair', icon: Wrench, color: 'bg-slate-100 text-slate-600' },
  { id: '6', name: 'Fashion', icon: Shirt, color: 'bg-emerald-100 text-emerald-600' },
  { id: '7', name: 'Other', icon: Zap, color: 'bg-yellow-100 text-yellow-600' },
];

export const CategoryScroll = () => {
  return (
    <div className="py-4">
      <div className="flex overflow-x-auto gap-4 px-4 md:px-6 pb-2 hide-scrollbar snap-x">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="snap-start shrink-0 flex flex-col items-center gap-2"
          >
            <Link 
              to={`/categories/${category.name.toLowerCase()}`}
              className="flex items-center justify-center w-14 h-14 rounded-2xl shadow-sm border border-border/50 bg-card hover:scale-105 active:scale-95 transition-transform"
            >
              <div className={`p-2.5 rounded-xl ${category.color}`}>
                <category.icon className="w-5 h-5" />
              </div>
            </Link>
            <span className="text-[11px] font-medium text-muted-foreground">
              {category.name}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
