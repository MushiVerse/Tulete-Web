import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { reviewService, Review, ReviewTargetType } from '../services/reviewService';

interface ReviewsStore {
  reviews: Review[];
  initialized: boolean;
  
  // Actions
  initialize: () => void;
  addReview: (review: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'helpfulVotes'>) => void;
  deleteReview: (reviewId: string) => void;
  voteHelpful: (reviewId: string) => void;
}

export const useReviewsStore = create<ReviewsStore>()(
  persist(
    (set, get) => ({
      reviews: [],
      initialized: false,

      initialize: () => {
        if (get().initialized) return;
        const initialReviews = reviewService.getMockReviews();
        set({
          reviews: initialReviews,
          initialized: true,
        });
      },

      addReview: (reviewData) => {
        const newReview: Review = {
          id: `rev_${Date.now()}`,
          ...reviewData,
          helpfulVotes: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set({
          reviews: [newReview, ...get().reviews],
        });
      },

      deleteReview: (reviewId) => {
        set({
          reviews: get().reviews.filter((r) => r.id !== reviewId),
        });
      },

      voteHelpful: (reviewId) => {
        const updated = get().reviews.map((r) => {
          if (r.id === reviewId) {
            return {
              ...r,
              helpfulVotes: r.helpfulVotes + 1,
            };
          }
          return r;
        });

        set({ reviews: updated });
      },
    }),
    {
      name: 'tulete_reviews_storage', // Persist storage
    }
  )
);
