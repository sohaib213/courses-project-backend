import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
  async deleteFile(publicId: string): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error(`Failed to delete file: ${JSON.stringify(error)}`);
      throw err;
    }
  }

  extractPublicId(imageUrl: string): string {
    // https://res.cloudinary.com/dspfo4tsu/image/upload/v1768723965/users/profiles/ydlkmhklfscu4auerm7a.png
    try {
      const urlParts = imageUrl.split('/upload/');
      if (urlParts.length < 2) {
        console.warn(`Invalid Cloudinary URL format: ${imageUrl}`);
        return null;
      }

      // Get everything after '/upload/' → "v1768723965/users/profiles/ydlkmhklfscu4auerm7a.png"
      let pathAfterUpload = urlParts[1];

      // Remove version prefix (v1768723965/) → "users/profiles/ydlkmhklfscu4auerm7a.png"
      pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

      // Remove file extension (.png) → "users/profiles/ydlkmhklfscu4auerm7a"
      const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');

      return publicId;
    } catch (error) {
      console.error(`Failed to extract public ID from URL: ${imageUrl}`, error);
      return null;
    }
  }
}
