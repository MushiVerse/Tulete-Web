import React from 'react';
import { motion } from 'framer-motion';

const promos = [
  {
    id: 1,
    title: 'Super Weekend Sale!',
    subtitle: 'Up to 50% off on all electronics',
    bgClass: 'bg-gradient-to-r from-primary to-blue-800',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500&q=80',
  },
  {
    id: 2,
    title: 'Free Delivery',
    subtitle: 'On your first 3 orders this week',
    bgClass: 'bg-gradient-to-r from-emerald-600 to-teal-800',
    image: 'https://images.unsplash.com/photo-1617462006312-c43916298bb3?w=500&q=80',
  }
];

export const PromoCarousel = () => {
  return (
    <div className="py-2">
      <div className="flex overflow-x-auto gap-4 px-4 md:px-6 pb-4 hide-scrollbar snap-x snap-mandatory">
        {promos.map((promo, index) => (
          <motion.div
            key={promo.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="snap-center shrink-0 w-[90vw] md:w-[600px] h-40 md:h-48 rounded-2xl relative overflow-hidden shadow-sm"
          >
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 bg-muted">
              <img 
                src={promo.image} 
                alt="Promo background" 
                className="w-full h-full object-cover opacity-40 mix-blend-overlay"
              />
            </div>
            
            {/* Gradient Overlay */}
            <div className={`absolute inset-0 ${promo.bgClass} opacity-45`} />

            {/* Content */}
            <div className="absolute inset-0 p-6 flex flex-col justify-center text-white">
              <h2 className="text-2xl font-bold tracking-tight mb-1 max-w-[70%]">
                {promo.title}
              </h2>
              <p className="text-sm text-white/80 max-w-[70%] mb-4">
                {promo.subtitle}
              </p>
              <button className="w-fit bg-white text-primary text-xs font-bold px-4 py-2 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-transform">
                Shop Now
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
