import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

class StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private enabled: boolean;

  constructor() {
    const endpoint = process.env.B2_ENDPOINT;
    const keyId = process.env.B2_KEY_ID;
    const applicationKey = process.env.B2_APPLICATION_KEY;
    this.bucketName = process.env.B2_BUCKET_NAME || '';

    this.enabled = !!(endpoint && keyId && applicationKey && this.bucketName);

    if (!this.enabled) {
      logger.warn('Backblaze B2 not configured. File storage disabled.');
      this.s3Client = {} as S3Client;
      return;
    }

    this.s3Client = new S3Client({
      endpoint,
      region: 'us-west-000',
      credentials: {
        accessKeyId: keyId!,
        secretAccessKey: applicationKey!
      }
    });

    logger.info('Backblaze B2 storage initialized');
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!this.enabled) {
      throw new Error('Storage service not configured');
    }

    const ext = file.originalname.split('.').pop();
    const key = `${folder}/${randomUUID()}.${ext}`;

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    }));

    logger.info('File uploaded', { key, size: file.size });
    return key;
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      }));
      logger.info('File deleted', { key });
    } catch (error) {
      logger.error('Failed to delete file', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.enabled) {
      throw new Error('Storage service not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  getPublicUrl(key: string): string {
    const endpoint = process.env.B2_ENDPOINT || '';
    return `${endpoint}/${this.bucketName}/${key}`;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export default new StorageService();
