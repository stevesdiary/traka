import { BaseRepository } from '../repositories/base.repository.js';
import { RatingModel } from './rating.model.js';

export class RatingRepository extends BaseRepository<RatingModel> {
  constructor() {
    super(RatingModel);
  }

  async findByRider(rider_id: string, limit = 50): Promise<RatingModel[]> {
    return this.model.findAll({
      where: { rider_id },
      order: [['createdAt', 'DESC']],
      limit,
      include: ['rater']
    });
  }

  async findByPackage(package_id: string): Promise<RatingModel | null> {
    return this.model.findOne({
      where: { package_id }
    });
  }

  async getRiderStats(rider_id: string): Promise<{ avgRating: number; totalRatings: number }> {
    const ratings = await this.model.findAll({
      where: { rider_id },
      attributes: ['rating']
    });

    if (ratings.length === 0) {
      return { avgRating: 0, totalRatings: 0 };
    }

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return {
      avgRating: Number((sum / ratings.length).toFixed(2)),
      totalRatings: ratings.length
    };
  }

  async create(data: {
    package_id: string;
    rider_id: string;
    rated_by: string;
    rating: number;
    review?: string;
  }): Promise<RatingModel> {
    return await this.model.create(data as any);
  }
}
