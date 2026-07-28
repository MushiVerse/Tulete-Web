import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useReviewsStore } from '../hooks/useReviewsStore';
import { ratingService, Review, ReviewTargetType } from '../services/reviewService';
import { ReviewSubmissionForm } from '../components/ReviewSubmissionForm';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { Badge } from '../../../shared/components/ui/Badge';
import { 
  Star, CheckCircle2, User, MessageSquare, ThumbsUp, 
  Trash2, ShieldAlert, Sparkles, ArrowLeft, Heart, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ReviewsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Route parameters
  const orderId = searchParams.get('orderId') || 'order_1002';
  const targetId = searchParams.get('targetId') || 's2'; // default: Kibanda Delight
  const targetType = (searchParams.get('targetType') || 'store') as ReviewTargetType;
  const targetName = searchParams.get('targetName') || 'Kibanda Delight Fast Food';

  // Local state
  const [activeFormTarget, setActiveFormTarget] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const { reviews, initialize, addReview, voteHelpful, deleteReview } = useReviewsStore();

  // Initialize reviews database
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Target-specific reviews
  const targetReviews = reviews.filter((r) => r.targetId === targetId);

  // Calculate rating aggregate
  const stats = ratingService.calculateBreakdown(reviews, targetId);

  // Filtered reviews list
  const filteredReviews = targetReviews.filter((r) => {
    if (filterRating !== null && r.rating !== filterRating) return false;
    return true;
  });

  // Handle successful submit
  const handleReviewSuccess = (rating: number, comment: string) => {
    addReview({
      userId: 'user_current',
      userName: 'Alex Zalongwa (You)',
      userAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80',
      rating,
      comment,
      targetId,
      targetType,
      orderId,
      isVerifiedPurchase: true,
    });
    setActiveFormTarget(null);
  };

  return (
    <PageContainer>
      <ContentContainer size="md" className="flex flex-col min-h-[85vh]">
      {/* Back button */}
      <button 
        onClick={() => navigate('/orders')}
        className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary transition-colors mb-6 self-start cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Orders
      </button>

      {/* Header */}
      <div className="bg-muted border border-border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-extrabold tracking-widest text-slate-400">Order Verification</span>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h2 className="font-bold text-foreground text-base">
                Feedback for: {targetName}
              </h2>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/10 text-[10px] font-bold py-1 px-2.5">
            Verified purchase {orderId}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Ratings distribution aggregates & Write form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5 border border-border shadow-sm bg-card">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-slate-50 dark:border-slate-800">
              Ratings Summary
            </h3>
            
            <div className="text-center pb-4">
              <h2 className="text-5xl font-extrabold text-slate-950 dark:text-white">
                {stats.average}
              </h2>
              
              <div className="flex items-center justify-center gap-0.5 mt-2 mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star 
                    key={s} 
                    className={`w-4 h-4 ${
                      s <= Math.round(stats.average) 
                        ? 'fill-amber-400 stroke-amber-400' 
                        : 'stroke-slate-300 dark:stroke-slate-700'
                    }`} 
                  />
                ))}
              </div>
              
              <span className="text-[10px] text-slate-450 font-bold">
                Based on {stats.total} verified reviews
              </span>
            </div>

            <div className="space-y-2 mt-4 text-[10px] text-muted-foreground font-semibold">
              {[5, 4, 3, 2, 1].map((stars) => {
                const pct = (stats.distribution as Record<number, string>)[stars] || '0%';
                return (
                  <button
                    key={stars}
                    onClick={() => setFilterRating(filterRating === stars ? null : stars)}
                    className={`flex items-center gap-3 w-full text-left p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-950 transition-all ${
                      filterRating === stars ? 'bg-primary/5 text-primary' : ''
                    }`}
                  >
                    <span className="w-2 text-right">{stars}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400 flex-shrink-0" />
                    
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: pct }} 
                      />
                    </div>
                    
                    <span className="w-8 text-right">{pct}</span>
                  </button>
                );
              })}
            </div>

            {filterRating !== null && (
              <button 
                onClick={() => setFilterRating(null)}
                className="w-full text-center text-[10px] font-bold text-rose-500 mt-4 hover:underline"
              >
                Clear Rating Filter
              </button>
            )}
          </Card>

          {/* Quick Review submission selector */}
          {activeFormTarget !== targetId ? (
            <Button
              onClick={() => setActiveFormTarget(targetId)}
              className="w-full font-bold text-xs shadow-md"
            >
              Write a Review
            </Button>
          ) : (
            <ReviewSubmissionForm
              targetId={targetId}
              targetType={targetType}
              orderId={orderId}
              onSuccess={handleReviewSuccess}
              onCancel={() => setActiveFormTarget(null)}
            />
          )}
        </div>

        {/* RIGHT COLUMN: Reviews List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
            Reviews History ({filteredReviews.length})
          </h3>

          {filteredReviews.length === 0 ? (
            <div className="text-center py-16 bg-muted/40 border border-border/80 rounded-2xl">
              <MessageSquare className="w-12 h-12 text-slate-350 mx-auto mb-4" />
              <h4 className="text-sm font-bold text-foreground mb-1">No Reviews Available</h4>
              <p className="text-xs text-slate-550 dark:text-slate-400 max-w-sm mx-auto">
                {filterRating 
                  ? `There are no reviews with a ${filterRating}-star rating for this partner.`
                  : 'Be the first to share your verified purchase review!'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredReviews.map((rev) => (
                  <motion.div
                    key={rev.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card className="p-5 border border-border bg-card shadow-sm relative group">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex items-center gap-2.5">
                          {rev.userAvatarUrl ? (
                            <img 
                              src={rev.userAvatarUrl} 
                              alt={rev.userName} 
                              className="w-9 h-9 rounded-full object-cover bg-slate-50"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {rev.userName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-xs text-foreground truncate">
                                {rev.userName}
                              </h4>
                              {rev.isVerifiedPurchase && (
                                <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[8px] py-0 px-1 font-extrabold rounded-sm uppercase tracking-wider">
                                  Verified Customer
                                </Badge>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              {new Date(rev.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating 
                                  ? 'fill-amber-400 stroke-amber-400' 
                                  : 'stroke-slate-200 dark:stroke-slate-850'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-650 dark:text-slate-450 leading-relaxed mb-4">
                        {rev.comment}
                      </p>

                      <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-3 text-[10px]">
                        <button
                          onClick={() => voteHelpful(rev.id)}
                          className="flex items-center gap-1.5 font-bold text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Helpful ({rev.helpfulVotes})</span>
                        </button>

                        <div className="flex gap-2">
                          <button 
                            className="text-slate-400 hover:text-rose-500 flex items-center gap-1 font-bold"
                            title="Report review"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Report
                          </button>

                          {rev.userId === 'user_current' && (
                            <button
                              onClick={() => deleteReview(rev.id)}
                              className="text-slate-400 hover:text-rose-600 flex items-center gap-1 font-bold"
                              title="Delete review"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      </ContentContainer>
    </PageContainer>
  );
};
