import { Request, Response } from 'express';
import { RatingService } from './rating.service.js';

export class RatingController {
  private ratingService = new RatingService();

  createRating = async (req: Request, res: Response): Promise<void> => {
    try {
      const { package_id, rider_id, rating, review } = req.body;
      const rated_by = req.user!.userId;

      const newRating = await this.ratingService.createRating(
        package_id,
        rider_id,
        rated_by,
        rating,
        review
      );

      res.status(201).json({
        message: 'Rating submitted successfully',
        rating: newRating
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('only') || error.message.includes('already')) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to submit rating' });
    }
  };

  getRiderRatings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { rider_id } = req.params as Record<string, string>;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const result = await this.ratingService.getRiderRatings(Array.isArray(rider_id) ? String(rider_id[0]) : String(rider_id), limit);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get rider ratings' });
    }
  };

  getRiderStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { rider_id } = req.params as Record<string, string>;

      const stats = await this.ratingService.getRiderStats(Array.isArray(rider_id) ? String(rider_id[0]) : String(rider_id));

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get rider stats' });
    }
  };

  getPublicRatings = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await this.ratingService.getPublicRatings(limit);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get public ratings' });
    }
  };
}
