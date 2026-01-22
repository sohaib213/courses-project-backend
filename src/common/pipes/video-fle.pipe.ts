import {
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';

export class VideoFilePipe extends ParseFilePipe {
  constructor(fileIsRequired = false) {
    super({
      fileIsRequired,
      validators: [
        new MaxFileSizeValidator({
          maxSize: 1000 * 1024 * 1024, // 1000 MB for videos
        }),
        new FileTypeValidator({
          fileType: /^video\/(mp4|mpeg|quicktime|x-msvideo|webm)$/,
        }),
      ],
    });
  }
}
