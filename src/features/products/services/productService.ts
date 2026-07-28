import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter 
} from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument, QueryParams } from '../../../core/services/types';

import { searchTuleteItems } from '../../../core/services/algoliaService';

export interface Product extends BaseDocument {
  name: string;
  description: string;
  price: number;
  oldprice?: number; // For "Super Saving" strike-through
  imgUrl: string;
  imgURL?: string[] | string;
  images?: string[];
  storeId: string;
  store: string;
  rating: number;
  reviewCount: number;
  category: string;
  cat?: string;
  subCat?: string;
  subSubCat?: string;
  speccat?: string;
  _collection?: string;
  tags: string[]; // e.g. "Most Popular", "Super Saver"
  availability: boolean;
  idadi?: number;
  quantity?: number;
  location?: { lat: number; lng: number };
  time?: string;
}

class ProductService extends BaseFirestoreService<Product> {
  constructor() {
    super('foods');
  }

  protected override parse(data: any): Product {
    // Flutter stores ratings as a `rate` array (e.g. [4.5, 3.0, 5.0])
    // We compute the average here to get the display rating.
    let rating = 0;
    let reviewCount = 0;
    if (Array.isArray(data.rate) && data.rate.length > 0) {
      const rates = data.rate.map(Number).filter((n: number) => !isNaN(n));
      reviewCount = rates.length;
      rating = rates.reduce((sum: number, r: number) => sum + r, 0) / reviewCount;
    } else if (typeof data.rate === 'number') {
      rating = data.rate;
      reviewCount = data.reviewCount !== undefined ? Number(data.reviewCount) : 1;
    } else if (data.rating !== undefined) {
      rating = Number(data.rating);
      reviewCount = data.reviewCount !== undefined ? Number(data.reviewCount) : 0;
    }

    // Fallback to a static rating if there are no reviews yet
    if (rating === 0 || reviewCount === 0) {
      // Deterministic static rating (e.g., 4.5, 4.6, 4.7...) so it doesn't flicker
      rating = 4.5 + ((data.name?.length || 5) % 5) / 10;
    }

    let lat = undefined;
    let lng = undefined;
    
    if (data.location && typeof data.location === 'string') {
      const parts = data.location.split(',');
      if (parts.length === 2) {
        const parsedLat = parseFloat(parts[0].trim());
        const parsedLng = parseFloat(parts[1].trim());
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          lat = parsedLat;
          lng = parsedLng;
        }
      }
    } else if (data.location && typeof data.location.lat === 'number' && typeof data.location.lng === 'number') {
      lat = data.location.lat;
      lng = data.location.lng;
    } else if (data.location && typeof data.location.latitude === 'number' && typeof data.location.longitude === 'number') {
      lat = data.location.latitude;
      lng = data.location.longitude;
    }

    const rawImages = data.imgURL || data.imgUrl || data.images;
    let imagesList: string[] = [];
    if (Array.isArray(rawImages)) {
      imagesList = rawImages.filter(s => typeof s === 'string' && s.trim().length > 0);
    } else if (typeof rawImages === 'string' && rawImages.trim().length > 0) {
      imagesList = [rawImages.trim()];
    }

    const mainImgUrl = imagesList.length > 0 ? imagesList[0] : 
                      (typeof data.imgUrl === 'string' && data.imgUrl.trim().length > 0 ? data.imgUrl.trim() : 
                      (typeof data.imgURL === 'string' && data.imgURL.trim().length > 0 ? data.imgURL.trim() : ''));

    return {
      id: data.id,
      name: data.name || '',
      description: data.description || '',
      price: data.price !== undefined ? Number(data.price) : 0,
      oldprice: data.oldprice !== undefined ? Number(data.oldprice) : undefined,
      imgUrl: mainImgUrl,
      imgURL: data.imgURL || data.imgUrl || data.images || mainImgUrl,
      images: imagesList.length > 0 ? imagesList : (mainImgUrl ? [mainImgUrl] : []),
      storeId: data.storeId || '',
      store: data.store || '',
      rating: Math.round(rating * 10) / 10, // round to 1 decimal
      reviewCount,
      category: (data.category && data.category !== 'Product') ? data.category : (data.cat || data.category || ''),
      cat: data.cat || data.category,
      subCat: data.subCat || data.subcat || data.subCategory || data.scat,
      subSubCat: data.subSubCat || data.subsubcat || data.subSubCategory || data.speccat,
      speccat: data.speccat || data.subSubCat,
      _collection: data._collection,
      tags: data.tags || [],
      availability: data.availability !== undefined ? !!data.availability : true,
      idadi: data.idadi !== undefined ? (typeof data.idadi === 'number' ? data.idadi : parseInt(data.idadi, 10)) : undefined,
      quantity: data.quantity !== undefined ? (typeof data.quantity === 'number' ? data.quantity : parseInt(data.quantity, 10)) : undefined,
      location: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
      time: data.time,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  override async getById(id: string): Promise<Product | null> {
    if (!id) return null;
    const decodedId = decodeURIComponent(id);

    try {
      // 1. Try exact doc ID match in foods, products, cloths collections
      const collectionsToTry = ['foods', 'products', 'cloths'];
      for (const colName of collectionsToTry) {
        try {
          const docRef = doc(db, colName, decodedId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return this.parse({ id: docSnap.id, _collection: colName, ...docSnap.data() });
          }
        } catch (_) {}
      }

      // If raw id is different from decodedId, try raw id as well
      if (id !== decodedId) {
        for (const colName of collectionsToTry) {
          try {
            const docRef = doc(db, colName, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              return this.parse({ id: docSnap.id, _collection: colName, ...docSnap.data() });
            }
          } catch (_) {}
        }
      }

      // 2. Try querying by 'name' field in foods, products, cloths
      for (const colName of collectionsToTry) {
        try {
          const q = query(collection(db, colName), where('name', '==', decodedId), limit(1));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const docVal = querySnap.docs[0];
            return this.parse({ id: docVal.id, _collection: colName, ...docVal.data() });
          }
        } catch (_) {}
      }

      // 3. Try Algolia search for matching item
      try {
        const hits = await searchTuleteItems(decodedId, { hitsPerPage: 1 });
        if (hits && hits.length > 0) {
          const item = hits[0];
          return this.parse({
            id: item.objectID || item.id || decodedId,
            name: item.name || decodedId,
            description: item.description || '',
            price: item.price || 0,
            oldprice: item.oldprice,
            imgURL: item.imgURL || item.image || item.imgUrl,
            storeId: item.storeId || '',
            store: item.store || '',
            rating: item.rating || 4.5,
            reviewCount: item.reviewCount || 10,
            category: item.category || 'Product',
            availability: true
          });
        }
      } catch (_) {}

      // 4. Fallback to mock products list
      const mock = this.getMockProducts().find(p => p.id === id || p.id === decodedId);
      if (mock) return mock;

      return null;
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      return null;
    }
  }

  override async getMany(params?: QueryParams): Promise<{ data: Product[]; lastDoc: any }> {
    let targetCollection = 'foods';

    if (params?.filters) {
      // 1. Check for explicit collection routing
      const collFilter = params.filters.find(f => f.field === '_collection');
      if (collFilter && collFilter.operator === '==') {
        targetCollection = String(collFilter.value);
      } else {
        // Fallback to legacy category-based routing
        const catFilter = params.filters.find(f => f.field === 'category');
        if (catFilter && catFilter.operator === '==') {
          const val = String(catFilter.value).toLowerCase();
          if (val.includes('nguo') || val.includes('cloth')) {
            targetCollection = 'cloths';
          } else if (val.includes('product') || val.includes('retail')) {
            targetCollection = 'products';
          }
        }
      }
    }

    const constraints: any[] = [];
    if (params?.filters) {
      params.filters.forEach(f => {
        if (f.field !== '_collection') {
          constraints.push(where(f.field, f.operator, f.value));
        }
      });
    }

    if (params?.orderByField) {
      constraints.push(orderBy(params.orderByField, params.orderDirection || 'asc'));
    }

    if (params?.limit) {
      constraints.push(limit(params.limit));
    }

    if (params?.lastDoc) {
      constraints.push(startAfter(params.lastDoc));
    }

    try {
      const q = query(collection(db, targetCollection), ...constraints);
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map(docVal => this.parse({ id: docVal.id, ...docVal.data() }));
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      return { data, lastDoc };
    } catch (error) {
      console.error(`Error querying collection ${targetCollection}:`, error);
      return { data: [], lastDoc: null };
    }
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
        oldprice: 1200,
        imgUrl: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=300',
        storeId: 'store_mama_safi',
        store: 'Mama Safi Laundry & Dryclean',
        rating: 4.9,
        reviewCount: 45,
        category: 'Suits',
        tags: ['Eco Clean', 'Hand Pressed'],
        availability: true
      },
      {
        id: 'prod_laund_2',
        name: 'Express Wash & Fold (5kg Bag)',
        description: 'Everyday wear items washed, tumble dried, and neatly folded. Perfect for weekly loads.',
        price: 800,
        imgUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebd01?w=300',
        storeId: 'store_mama_safi',
        store: 'Mama Safi Laundry & Dryclean',
        rating: 4.8,
        reviewCount: 68,
        category: 'Bag Wash',
        tags: ['Fast Turnaround'],
        availability: true
      },
      {
        id: 'prod_laund_3',
        name: 'Duvet / Comforter Clean (King Size)',
        description: 'Heavy king-size bedding sanitization. Eliminates allergens and leaves sheets fresh.',
        price: 1500,
        imgUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=300',
        storeId: 'store_mama_safi',
        store: 'Mama Safi Laundry & Dryclean',
        rating: 4.7,
        reviewCount: 22,
        category: 'Bedding',
        tags: ['Deep Clean'],
        availability: true
      },

      // Kibanda Delight (store_kibanda_delight)
      {
        id: 'prod_food_1',
        name: '1kg Nyama Choma Platter',
        description: 'Goat meat slow roasted over traditional charcoal. Served with Kkachumbari, Ugali, and Sukuma.',
        price: 1300,
        oldprice: 1500,
        imgUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300',
        storeId: 'store_kibanda_delight',
        store: 'Kibanda Delight Fast Food',
        rating: 4.9,
        reviewCount: 74,
        category: 'Platters',
        tags: ['Most Popular', 'Traditional'],
        availability: true
      },
      {
        id: 'prod_food_2',
        name: 'Chapati Madondo Combo',
        description: 'Two flaky, hand-rolled Chapati served with a rich, spiced yellow bean stew (Madondo).',
        price: 180,
        imgUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300',
        storeId: 'store_kibanda_delight',
        store: 'Kibanda Delight Fast Food',
        rating: 4.6,
        reviewCount: 52,
        category: 'Quick Meals',
        tags: ['Budget Friendly'],
        availability: true
      },

      // Fundi Power Electricals (store_fundi_power)
      {
        id: 'prod_elect_1',
        name: 'Emergency Breaker & Tripping Repair',
        description: 'Immediate diagnostic of home short-circuits, burnt fuse replacement, and safety grounding checks.',
        price: 2500,
        imgUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300',
        storeId: 'store_fundi_power',
        store: 'Fundi Power Electricals',
        rating: 4.9,
        reviewCount: 29,
        category: 'Repair',
        tags: ['Verified Pro', 'Express Service'],
        availability: true
      },
      {
        id: 'prod_elect_2',
        name: 'Smart Home Plug & Switch Fitting',
        description: 'Fitting of up to 4 standard wall switches or smart Wi-Fi socket units. Fast installation.',
        price: 1800,
        oldprice: 2200,
        imgUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300',
        storeId: 'store_fundi_power',
        store: 'Fundi Power Electricals',
        rating: 4.8,
        reviewCount: 16,
        category: 'Installation',
        tags: ['Quick Fit'],
        availability: true
      },

      // Glam Beauty Bar & Salon (store_glam_salon)
      {
        id: 'prod_beauty_1',
        name: 'Natural Knotless Braids',
        description: 'Classic medium knotless box braids. Lightweight, pain-free application. Braiding fibers included.',
        price: 3500,
        imgUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300',
        storeId: 'store_glam_salon',
        store: 'Glam Beauty Bar & Salon',
        rating: 4.8,
        reviewCount: 41,
        category: 'Hair Styling',
        tags: ['Signature Stylist'],
        availability: true
      },
      {
        id: 'prod_beauty_2',
        name: 'Gel Manicure & Accent Nail',
        description: 'Cuticle grooming, nail shaping, premium base coat, and gel color cured under UV. Includes 1 custom accent nail.',
        price: 1200,
        oldprice: 1500,
        imgUrl: 'https://images.unsplash.com/photo-1604654894610-df4906b185c3?w=300',
        storeId: 'store_glam_salon',
        store: 'Glam Beauty Bar & Salon',
        rating: 4.7,
        reviewCount: 33,
        category: 'Nails',
        tags: ['Best Value'],
        availability: true
      }
    ];

    if (storeId) {
      return allProducts.filter(p => p.storeId === storeId);
    }
    return allProducts;
  }
}

export const productService = new ProductService();
