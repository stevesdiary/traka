import { RatingRepository } from './rating.repository.js';
import { PackageRepository } from '../package/package.repository.js';

export class RatingService {
  private ratingRepository = new RatingRepository();
  private packageRepository = new PackageRepository();

  async createRating(
    package_id: string,
    rider_id: string,
    rated_by: string,
    rating: number,
    review?: string
  ): Promise<any> {
    const packageData = await this.packageRepository.findById(package_id);
    if (!packageData) {
      throw new Error('Package not found');
    }

    if (packageData.status !== 'DELIVERED') {
      throw new Error('Can only rate delivered packages');
    }

    if (packageData.sender_id !== rated_by) {
      throw new Error('Only sender can rate rider');
    }

    const existingRating = await this.ratingRepository.findByPackage(package_id);
    if (existingRating) {
      throw new Error('Package already rated');
    }

    return await this.ratingRepository.create({
      package_id,
      rider_id,
      rated_by,
      rating,
      review
    });
  }

  async getRiderRatings(rider_id: string, limit = 50): Promise<any> {
    const ratings = await this.ratingRepository.findByRider(rider_id, limit);
    const stats = await this.ratingRepository.getRiderStats(rider_id);

    return {
      stats,
      ratings: ratings.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        review: r.review,
        created_at: r.createdAt,
        rater_name: r.rater ? `${r.rater.first_name} ${r.rater.last_name}` : 'Anonymous'
      }))
    };
  }

  async getRiderStats(rider_id: string): Promise<any> {
    return await this.ratingRepository.getRiderStats(rider_id);
  }
}
