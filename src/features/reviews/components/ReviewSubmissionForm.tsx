import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Star, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Form validation schema using Zod
const reviewFormSchema = z.object({
  rating: z.number().min(1, 'Please select a rating of at least 1 star').max(5),
  comment: z.string()
    .min(10, 'Your review must be at least 10 characters long to provide helpful details')
    .max(500, 'Your review cannot exceed 500 characters'),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface ReviewSubmissionFormProps {
  targetId: string;
  targetType: 'store' | 'product' | 'service' | 'delivery';
  orderId?: string;
  onSuccess: (rating: number, comment: string) => void;
  onCancel?: () => void;
}

export const ReviewSubmissionForm: React.FC<ReviewSubmissionFormProps> = ({
  targetId,
  targetType,
  orderId,
  onSuccess,
  onCancel,
}) => {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  const ratingValue = watch('rating');
  const commentValue = watch('comment');

  const onSubmit = (data: ReviewFormValues) => {
    onSuccess(data.rating, data.comment);
  };

  return (
    <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-1">
            Submit Your Ratings
          </h3>
          <p className="text-[11px] text-slate-500">
            Share your authentic experience with the Tulete community.
          </p>
        </div>

        {/* Large pulsing Star Clicker Selector */}
        <div className="flex flex-col items-center py-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-900">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
            Click to rate
          </span>
          
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                type="button"
                onClick={() => setValue('rating', star, { shouldValidate: true })}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(null)}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className="focus:outline-none p-1 text-slate-350 transition-colors"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredRating !== null ? hoveredRating : ratingValue)
                      ? 'fill-amber-400 stroke-amber-400'
                      : 'stroke-slate-300 dark:stroke-slate-700'
                  }`}
                />
              </motion.button>
            ))}
          </div>

          {errors.rating && (
            <div className="flex items-center gap-1 mt-2 text-rose-500 text-[10px] font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.rating.message}</span>
            </div>
          )}

          {ratingValue > 0 && (
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">
              {ratingValue === 5 ? 'Perfect! 🔥' : ratingValue === 4 ? 'Good! 👍' : ratingValue === 3 ? 'Average' : 'Could be better'}
            </span>
          )}
        </div>

        {/* Written Review comment box */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Write your review
          </label>
          <textarea
            {...register('comment')}
            placeholder="Help others make informed decisions. How was the speed, cleanliness, and communication?"
            className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 outline-none focus:ring-1 focus:ring-primary placeholder-slate-400 dark:placeholder-slate-700"
            rows={4}
          />

          <div className="flex justify-between items-center mt-1">
            {errors.comment ? (
              <div className="flex items-center gap-1 text-rose-500 text-[10px] font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.comment.message}</span>
              </div>
            ) : (
              <div className="text-[9px] text-slate-400">
                Provide constructive, authentic feedback.
              </div>
            )}

            <div className="text-[9px] font-bold text-slate-400">
              {commentValue.length} / 500 chars
            </div>
          </div>
        </div>

        {/* Info badges */}
        <div className="flex items-center gap-2 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/5">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="text-[9px] text-emerald-600 dark:text-emerald-450 leading-normal font-semibold">
            Verified review: Automatically tagged with a **Verified Purchase** badge referencing order {orderId || '#TL-1002'}.
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="font-bold text-xs"
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="font-bold text-xs shadow-md"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
