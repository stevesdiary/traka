declare module 'backblaze-b2' {
  export default class B2 {
    constructor(config: { applicationKeyId: string; applicationKey: string });
    authorize(): Promise<any>;
    listBuckets(): Promise<any>;
    getUploadUrl(params: { bucketId: string }): Promise<any>;
    uploadFile(params: {
      uploadUrl: string;
      uploadAuthToken: string;
      fileName: string;
      data: Buffer;
      mime: string;
    }): Promise<any>;
    listFileNames(params: {
      bucketId: string;
      startFileName: string;
      maxFileCount: number;
      delimiter: string;
      prefix: string;
    }): Promise<any>;
    deleteFileVersion(params: { fileId: string; fileName: string }): Promise<any>;
    getDownloadAuthorization(params: {
      bucketId: string;
      fileNamePrefix: string;
      validDurationInSeconds: number;
    }): Promise<any>;
  }
}
