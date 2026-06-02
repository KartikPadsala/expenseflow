import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get('S3_ENDPOINT');
    this.bucket = this.configService.get('S3_BUCKET') || 'expenseflow';
    this.s3 = new S3Client({
      endpoint,
      region: this.configService.get('S3_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get('S3_ACCESS_KEY') || 'minioadmin',
        secretAccessKey: this.configService.get('S3_SECRET_KEY') || 'minioadmin',
      },
      forcePathStyle: !!endpoint,
    });
  }

  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    const endpoint = this.configService.get('S3_ENDPOINT');
    return endpoint ? `${endpoint}/${this.bucket}/${key}` : `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }
}
