import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';

export interface Product extends BaseDocument {
  name: string;
  description: string;
  price: number;
  originalPrice?: number; // For "Super Saving" strike-through
  imageUrl: string;
  storeId: string;
  storeName: string;
  rating: number;
  reviewCount: number;
  category: string;
  tags: string[]; // e.g. "Most Popular", "Super Saver"
  isAvailable: boolean;
}

class ProductService extends BaseFirestoreService<Product> {
  constructor() {
    super('products');
  }

  /**
   * Mock products matching the Tulete store profiles for high-fidelity offline/caching demo
   */
  getMockProducts(storeId?: string): Product[] {
    const allProducts: Product[] = [
      // Mama Safi Laundry (store_mama_safi)
      {
        id: 'prod_laund_1',
        name: 'Full Suit Dry Clean',
        description: 'Eco-friendly chemical clean for executive suits, blazers, and trousers. Hand-pressed and delivered on hangers.',
        price: 950,
        originalPrice: 1200,
        imageUrl: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=300',
        storeId: 'store_mama_safi',
        storeName: 'Mama Safi Laundry & Dryclean',
        rating: 4.9,
        reviewCount: 45,
        category: 'Suits',
        tags: ['Eco Clean', 'Hand Pressed'],
        isAvailable: true
      },
      {
        id: 'prod_laund_2',
        name: 'Express Wash & Fold (5kg Bag)',
        description: 'Everyday wear items washed, tumble dried, and neatly folded. Perfect for weekly loads.',
        price: 800,
        imageUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebd01?w=300',
        storeId: 'store_mama_safi',
        storeName: 'Mama Safi Laundry & Dryclean',
        rating: 4.8,
        reviewCount: 68,
        category: 'Bag Wash',
        tags: ['Fast Turnaround'],
        isAvailable: true
      },
      {
        id: 'prod_laund_3',
        name: 'Duvet / Comforter Clean (King Size)',
        description: 'Heavy king-size bedding sanitization. Eliminates allergens and leaves sheets fresh.',
        price: 1500,
        imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=300',
        storeId: 'store_mama_safi',
        storeName: 'Mama Safi Laundry & Dryclean',
        rating: 4.7,
        reviewCount: 22,
        category: 'Bedding',
        tags: ['Deep Clean'],
        isAvailable: true
      },

      // Kibanda Delight (store_kibanda_delight)
      {
        id: 'prod_food_1',
        name: '1kg Nyama Choma Platter',
        description: 'Goat meat slow roasted over traditional charcoal. Served with Kkachumbari, Ugali, and Sukuma.',
        price: 1300,
        originalPrice: 1500,
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300',
        storeId: 'store_kibanda_delight',
        storeName: 'Kibanda Delight Fast Food',
        rating: 4.9,
        reviewCount: 74,
        category: 'Platters',
        tags: ['Most Popular', 'Traditional'],
        isAvailable: true
      },
      {
        id: 'prod_food_2',
        name: 'Chapati Madondo Combo',
        description: 'Two flaky, hand-rolled Chapati served with a rich, spiced yellow bean stew (Madondo).',
        price: 180,
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300',
        storeId: 'store_kibanda_delight',
        storeName: 'Kibanda Delight Fast Food',
        rating: 4.6,
        reviewCount: 52,
        category: 'Quick Meals',
        tags: ['Budget Friendly'],
        isAvailable: true
      },

      // Fundi Power Electricals (store_fundi_power)
      {
        id: 'prod_elect_1',
        name: 'Emergency Breaker & Tripping Repair',
        description: 'Immediate diagnostic of home short-circuits, burnt fuse replacement, and safety grounding checks.',
        price: 2500,
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300',
        storeId: 'store_fundi_power',
        storeName: 'Fundi Power Electricals',
        rating: 4.9,
        reviewCount: 29,
        category: 'Repair',
        tags: ['Verified Pro', 'Express Service'],
        isAvailable: true
      },
      {
        id: 'prod_elect_2',
        name: 'Smart Home Plug & Switch Fitting',
        description: 'Fitting of up to 4 standard wall switches or smart Wi-Fi socket units. Fast installation.',
        price: 1800,
        originalPrice: 2200,
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300',
        storeId: 'store_fundi_power',
        storeName: 'Fundi Power Electricals',
        rating: 4.8,
        reviewCount: 16,
        category: 'Installation',
        tags: ['Quick Fit'],
        isAvailable: true
      },

      // Glam Beauty Bar & Salon (store_glam_salon)
      {
        id: 'prod_beauty_1',
        name: 'Natural Knotless Braids',
        description: 'Classic medium knotless box braids. Lightweight, pain-free application. Braiding fibers included.',
        price: 3500,
        imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300',
        storeId: 'store_glam_salon',
        storeName: 'Glam Beauty Bar & Salon',
        rating: 4.8,
        reviewCount: 41,
        category: 'Hair Styling',
        tags: ['Signature Stylist'],
        isAvailable: true
      },
      {
        id: 'prod_beauty_2',
        name: 'Gel Manicure & Accent Nail',
        description: 'Cuticle grooming, nail shaping, premium base coat, and gel color cured under UV. Includes 1 custom accent nail.',
        price: 1200,
        originalPrice: 1500,
        imageUrl: 'https://images.unsplash.com/photo-1604654894610-df4906b185c3?w=300',
        storeId: 'store_glam_salon',
        storeName: 'Glam Beauty Bar & Salon',
        rating: 4.7,
        reviewCount: 33,
        category: 'Nails',
        tags: ['Best Value'],
        isAvailable: true
      }
    ];

    if (storeId) {
      return allProducts.filter(p => p.storeId === storeId);
    }
    return allProducts;
  }
}

export const productService = new ProductService();
