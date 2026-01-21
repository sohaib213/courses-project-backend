// common/pipes/image-file.pipe.ts
import {
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';

export class ImageFilePipe extends ParseFilePipe {
  constructor(fileIsRequired = false) {
    super({
      fileIsRequired,
      validators: [
        new MaxFileSizeValidator({
          maxSize: 5 * 1024 * 1024, // 5MB
        }),
        new FileTypeValidator({
          fileType: /^image\/(jpeg|jpg|png|webp)$/,
        }),
      ],
    });
  }
}
