import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'users',
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

  // Helper method to extract public_id from Cloudinary URL
  extractPublicId(imageUrl: string): string {
    const parts = imageUrl.split('/');
    const uploadIndex = parts.indexOf('upload');

    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL');
    }

    const publicIdWithExtension = parts.slice(uploadIndex + 2).join('/');
    const publicId = publicIdWithExtension.substring(
      0,
      publicIdWithExtension.lastIndexOf('.'),
    );

    return publicId;
  }
}
