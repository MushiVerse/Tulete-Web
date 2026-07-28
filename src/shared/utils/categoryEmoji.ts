/**
 * Utility helper to map category and subcategory names to representative emojis.
 */
const EMOJI_MAP: Record<string, string> = {
  // Food & Beverages
  'all food': '🍽️',
  'fast food': '🍔',
  'healthy': '🥗',
  'local': '🥘',
  'swahili': '🥘',
  'swahili food': '🥘',
  'swahili dishes': '🥘',
  'drinks': '🥤',
  'beverages': '🥤',
  'desserts': '🍰',
  'pizza': '🍕',
  'burger': '🍔',
  'burgers': '🍔',
  'nyama choma': '🥩',
  'barbecue': '🍖',
  'bbq': '🍖',
  'breakfast': '🍳',
  'coffee': '☕',
  'tea': '🍵',
  'juices': '🧃',
  'juice': '🧃',
  'ice cream': '🍦',
  'cakes': '🎂',
  'bakery': '🥖',
  'snacks': '🍿',
  'seafood': '🦐',
  'chicken': '🍗',
  'rice': '🍚',
  'chips': '🍟',
  'fries': '🍟',

  // Products & Retail
  'all products': '🛍️',
  'electronics': '📱',
  'tech': '💻',
  'phones': '📱',
  'fashion': '👕',
  'clothing': '👗',
  'clothes': '👔',
  'shoes': '👟',
  'bags': '🎒',
  'beauty': '💄',
  'cosmetics': '💅',
  'home': '🛋️',
  'home & living': '🏡',
  'appliances': '🔌',
  'groceries': '🛒',
  'supermarket': '🏪',
  'sports': '⚽',
  'toys': '🧸',
  'jewelry': '💍',
  'watches': '⌚',
  'repair': '🔧',
  'hardware': '🛠️',
  'auto': '🚗',
  'pharmacy': '💊',
  'health': '🩺',
  'books': '📚',
  'stationery': '✏️',

  // Stores & Services
  'food': '🍕',
  'laundry': '🧺',
  'nguo': '👕',
  'electrical': '⚡',
  'rides': '🛵',
  'retail': '🏪',
  'salon': '✂️',
};

export const getCategoryEmoji = (name?: string, defaultEmoji: string = '🏷️'): string => {
  if (!name || typeof name !== 'string') return defaultEmoji;
  const key = name.trim().toLowerCase();
  
  if (EMOJI_MAP[key]) return EMOJI_MAP[key];

  // Partial match search
  for (const [mapName, emoji] of Object.entries(EMOJI_MAP)) {
    if (key.includes(mapName) || mapName.includes(key)) {
      return emoji;
    }
  }

  return defaultEmoji;
};
