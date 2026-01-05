import { Request, Response } from 'express';
import { LegalService } from './legal.service.js';

export class LegalController {
  private legalService = new LegalService();

  getFAQs = async (req: Request, res: Response): Promise<void> => {
    try {
      const faqs = await this.legalService.getFAQs();
      
      // Group FAQs by category
      const groupedFAQs = faqs.reduce((acc: any, faq) => {
        const category = faq.category || 'General';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          title: faq.title,
          content: faq.content
        });
        return acc;
      }, {});

      res.json({ faqs: groupedFAQs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getTermsOfService = async (req: Request, res: Response): Promise<void> => {
    try {
      const terms = await this.legalService.getTermsOfService();
      
      if (!terms) {
        res.status(404).json({ error: 'Terms of service not found' });
        return;
      }

      res.json({
        title: terms.title,
        content: terms.content,
        version: terms.content_version,
        last_updated: terms.updatedAt
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getCommissionPolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const policy = await this.legalService.getCommissionPolicy();
      
      if (!policy) {
        res.status(404).json({ error: 'Commission policy not found' });
        return;
      }

      res.json({
        title: policy.title,
        content: policy.content,
        version: policy.content_version,
        last_updated: policy.updatedAt
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  seedContent = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.legalService.seedLegalContent();
      res.json({ message: 'Legal content seeded successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}