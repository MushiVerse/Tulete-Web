import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';

export type ReviewTargetType = 'store' | 'product' | 'service' | 'delivery';

export interface Review extends BaseDocument {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  rating: number; // 1 - 5 stars
  comment: string;
  targetId: string; // storeId, productId, or attendantId
  targetType: ReviewTargetType;
  orderId?: string;
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
}

class ReviewService extends BaseFirestoreService<Review> {
  constructor() {
    super('reviews');
  }

  /**
   * Return initial high-fidelity reviews for Dodoma stores & products
   */
  getMockReviews(): Review[] {
    return [
      {
        id: 'rev_1',
        userId: 'u1',
        userName: 'Amani Kamau',
        userAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AK',
        rating: 5,
        comment: 'Mama Safi Laundry is exceptionally fast! My shirts returned fully pressed and wrapped in clean bags. High-fidelity service!',
        targetId: 's1',
        targetType: 'store',
        orderId: 'order_1001',
        isVerifiedPurchase: true,
        helpfulVotes: 12,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
      {
        id: 'rev_2',
        userId: 'u2',
        userName: 'Wanjiku Mwangi',
        userAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=WM',
        rating: 4,
        comment: 'Warm and delicious Chapati combo! Order arrived within 25 minutes near Kisasa. Driver was very polite.',
        targetId: 's2', // Kibanda Delight
        targetType: 'store',
        orderId: 'order_1002',
        isVerifiedPurchase: true,
        helpfulVotes: 5,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      },
      {
        id: 'rev_3',
        userId: 'u3',
        userName: 'Brian Otieno',
        userAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=BO',
        rating: 5,
        comment: 'Excellent executive suits ironing. No burning, steam smell was refreshing. Best in town.',
        targetId: 'p2', // Executive suit service item ID
        targetType: 'service',
        orderId: 'order_1003',
        isVerifiedPurchase: true,
        helpfulVotes: 9,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      },
      {
        id: 'rev_driver_1',
        userId: 'u2',
        userName: 'Wanjiku Mwangi',
        userAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=WM',
        rating: 5,
        comment: 'Mwangi was incredibly polite! He kept food warm in his insulated delivery bag and was very professional.',
        targetId: 'driver_mwangi',
        targetType: 'delivery',
        orderId: 'order_1002',
        isVerifiedPurchase: true,
        helpfulVotes: 3,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      }
    ];
  }
}

export const reviewService = new ReviewService();
export const ratingService = {
  /**
   * Helper to calculate statistical breakdowns of reviews array
   */
  calculateBreakdown: (reviewsList: Review[], targetId: string) => {
    const subset = reviewsList.filter((r) => r.targetId === targetId);
    if (subset.length === 0) {
      return {
        average: 0.0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const totalStars = subset.reduce((acc, curr) => acc + curr.rating, 0);
    const average = parseFloat((totalStars / subset.length).toFixed(1));

    const distribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    subset.forEach((r) => {
      const star = Math.round(r.rating);
      if (star >= 1 && star <= 5) {
        distribution[star]++;
      }
    });

    // Calculate percentages
    const distributionPct: { [key: number]: string } = { 5: '0%', 4: '0%', 3: '0%', 2: '0%', 1: '0%' };
    Object.keys(distribution).forEach((key: any) => {
      const pct = ((distribution[key] / subset.length) * 100).toFixed(0) + '%';
      distributionPct[key] = pct;
    });

    return {
      average,
      total: subset.length,
      distribution: distributionPct
    };
  }
};
