import B2 from 'backblaze-b2';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

interface B2Config {
  applicationKeyId: string;
  applicationKey: string;
  bucketName: string;
  bucketId?: string;
}

class StorageService {
  private b2: B2;
  private bucketName: string;
  private bucketId: string | null = null;
  private downloadUrl: string | null = null;
  private enabled: boolean;

  constructor() {
    const keyId = process.env.B2_KEY_ID;
    const applicationKey = process.env.B2_APPLICATION_KEY;
    this.bucketName = process.env.B2_BUCKET_NAME || '';

    this.enabled = !!(keyId && applicationKey && this.bucketName);

    if (!this.enabled) {
      logger.warn('Backblaze B2 not configured. File storage disabled.');
      this.b2 = {} as B2;
      return;
    }

    this.b2 = new B2({
      applicationKeyId: keyId!,
      applicationKey: applicationKey!,
    });

    logger.info('Backblaze B2 storage initialized');
  }

  private async initialize() {
    if (!this.bucketId) {
      try {
        logger.info('Attempting B2 authorization', { 
          keyId: process.env.B2_KEY_ID?.substring(0, 10) + '...', 
          keyLength: process.env.B2_APPLICATION_KEY?.length 
        });
        await this.b2.authorize();
        const response = await this.b2.listBuckets();
        const bucket = response.data.buckets.find(
          (b: any) => b.bucketName === this.bucketName
        );
        if (!bucket) throw new Error(`Bucket ${this.bucketName} not found`);
        this.bucketId = bucket.bucketId;
        this.downloadUrl = response.data.downloadUrl;
        logger.info('B2 authorization successful');
      } catch (error: any) {
        logger.error('B2 authorization failed', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          code: error.code
        });
        throw error;
      }
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!this.enabled) {
      throw new Error('Storage service not configured');
    }

    await this.initialize();

    const ext = file.originalname.split('.').pop();
    const fileName = `${folder}/${randomUUID()}.${ext}`;

    try {
      const uploadUrl = await this.b2.getUploadUrl({ bucketId: this.bucketId! });

      await this.b2.uploadFile({
        uploadUrl: uploadUrl.data.uploadUrl,
        uploadAuthToken: uploadUrl.data.authorizationToken,
        fileName,
        data: file.buffer,
        mime: file.mimetype,
      });

      logger.info('File uploaded', { fileName, size: file.size });
      return fileName;
    } catch (error: any) {
      logger.error('Storage upload failed', {
        error: error?.message || String(error),
        code: error?.name
      });
      throw new Error('File upload failed. Please try again later.');
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.initialize();

      const fileInfo = await this.b2.listFileNames({
        bucketId: this.bucketId!,
        startFileName: fileName,
        maxFileCount: 1,
        delimiter: '',
        prefix: ''
      });

      const file = fileInfo.data.files.find((f: any) => f.fileName === fileName);
      if (!file) {
        logger.warn('File not found for deletion', { fileName });
        return;
      }

      await this.b2.deleteFileVersion({
        fileId: file.fileId,
        fileName: file.fileName,
      });

      logger.info('File deleted', { fileName });
    } catch (error) {
      logger.error('Failed to delete file', {
        fileName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async getSignedUrl(fileName: string, expiresIn = 3600): Promise<string> {
    if (!this.enabled) {
      throw new Error('Storage service not configured');
    }

    await this.initialize();

    const auth = await this.b2.getDownloadAuthorization({
      bucketId: this.bucketId!,
      fileNamePrefix: fileName,
      validDurationInSeconds: expiresIn,
    });

    return `${this.downloadUrl}/file/${this.bucketName}/${fileName}?Authorization=${auth.data.authorizationToken}`;
  }

  getPublicUrl(fileName: string): string {
    if (!this.downloadUrl) {
      return `https://f000.backblazeb2.com/file/${this.bucketName}/${fileName}`;
    }
    return `${this.downloadUrl}/file/${this.bucketName}/${fileName}`;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export default new StorageService();
