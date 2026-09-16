import { apiFetch } from './client';
import { mockService } from './mockService';
import { Review, ReviewSummary } from '@/types/api';

export const reviewsApi = {
  async getSummary(): Promise<ReviewSummary> {
    try {
      return await apiFetch<ReviewSummary>('/reviews/summary', { skipAuth: true });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.getReviewsSummary();
      }
      throw err;
    }
  },

  async getReviews(page?: number, rating?: number): Promise<Review[]> {
    try {
      const q = new URLSearchParams();
      if (page) q.append('page', page.toString());
      if (rating) q.append('rating', rating.toString());
      return await apiFetch<Review[]>(`/reviews?${q.toString()}`, { skipAuth: true });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        let revs = await mockService.getReviews();
        if (rating) {
          revs = revs.filter((r) => r.rating === rating);
        }
        return revs;
      }
      throw err;
    }
  },

  async createReview(data: {
    order_id: string;
    rating: number;
    comment?: string;
  }): Promise<Review> {
    try {
      return await apiFetch<Review>('/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.createReview(data);
      }
      throw err;
    }
  },

  async updateReview(
    id: string,
    data: { rating: number; comment?: string }
  ): Promise<Review> {
    try {
      return await apiFetch<Review>(`/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        const rev = (await mockService.getReviews()).find((r) => r.id === id);
        if (rev) {
          rev.rating = data.rating;
          if (data.comment !== undefined) rev.comment = data.comment;
          return rev;
        }
      }
      throw err;
    }
  },
};

