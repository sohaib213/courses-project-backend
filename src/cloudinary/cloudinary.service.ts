import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

interface UploadOptions {
  folder: string;
  resourceType?: 'auto' | 'image' | 'video' | 'raw';
  transformation?: any;
  eager?: any;
}

interface CloudinaryDeleteResult {
  result: 'ok' | 'not found';
  [key: string]: unknown;
}

@Injectable()
export class CloudinaryService {
  /**
   * Upload file to Cloudinary (supports images, videos, and other files)
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    options?: Partial<UploadOptions>,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: options?.resourceType || 'auto',
          ...options,
        },
        (error, result) => {
          if (error) {
            return reject(
              new InternalServerErrorException(
                `Failed to upload file to Cloudinary: ${error.message || 'Unknown error'}`,
              ),
            );
          }
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Upload video with optimizations
   */
  async uploadVideo(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    return this.uploadFile(file, folder, {
      resourceType: 'video',
      eager: [{ width: 1280, height: 720, crop: 'limit', quality: 'auto' }],
    });
  }

  /**
   * Upload image with optimizations
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    return this.uploadFile(file, folder, {
      resourceType: 'image',
      transformation: {
        quality: 'auto',
        fetch_format: 'auto',
      },
    });
  }

  /**
   * Generate video thumbnail URL from video public ID
   */
  generateVideoThumbnail(publicId: string): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      format: 'jpg',
      transformation: [
        { width: 640, height: 360, crop: 'fill' },
        { quality: 'auto' },
      ],
    });
  }

  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<CloudinaryDeleteResult> {
    try {
      const result = (await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      })) as CloudinaryDeleteResult;

      if (result.result !== 'ok') {
        console.warn(`Failed to delete file: ${publicId}`, result);
      }

      return result;
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error(`Failed to delete file: ${JSON.stringify(error)}`);
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * Delete video from Cloudinary
   */
  async deleteVideo(publicId: string): Promise<CloudinaryDeleteResult> {
    return this.deleteFile(publicId, 'video');
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  extractPublicId(url: string): string | null {
    try {
      const urlParts = url.split('/upload/');
      if (urlParts.length < 2) {
        console.warn(`Invalid Cloudinary URL format: ${url}`);
        return null;
      }

      let pathAfterUpload = urlParts[1];
      pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
      const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');

      return publicId;
    } catch (error) {
      console.error(`Failed to extract public ID from URL: ${url}`, error);
      return null;
    }
  }

  /**
   * Get resource type from Cloudinary URL
   */
  getResourceType(url: string): 'image' | 'video' | 'raw' | null {
    try {
      if (url.includes('/image/upload/')) return 'image';
      if (url.includes('/video/upload/')) return 'video';
      if (url.includes('/raw/upload/')) return 'raw';
      return null;
    } catch (error) {
      console.error(`Failed to determine resource type: ${url}`, error);
      return null;
    }
  }

  /**
   * Delete file with auto-detected resource type from URL
   */
  async deleteFileAuto(url: string): Promise<CloudinaryDeleteResult> {
    const publicId = this.extractPublicId(url);
    if (!publicId) {
      throw new InternalServerErrorException('Invalid Cloudinary URL');
    }

    const resourceType = this.getResourceType(url) || 'image';
    return this.deleteFile(publicId, resourceType);
  }

  /**
   * Get file information from Cloudinary
   */
  async getFileInfo(
    publicId: string,
    resourceType: 'image' | 'video' = 'image',
  ): Promise<Record<string, unknown>> {
    try {
      const result = (await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      })) as Record<string, unknown>;
      return result;
    } catch (error) {
      console.error(`Failed to get file info for: ${publicId}`, error);
      throw new InternalServerErrorException('Failed to retrieve file info');
    }
  }
}
