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
          maxSize: 3 * 1024 * 1024 * 1024, // 1000 MB for videos
          errorMessage: 'Video size should not exceed 3 GB',
        }),
        new FileTypeValidator({
          skipMagicNumbersValidation: false,
          fileType: /^video\/(mp4|mpeg|quicktime|x-msvideo|webm)$/,
          errorMessage:
            'Only MP4, MPEG, MOV, AVI, and WEBM video files are allowed',
        }),
      ],
    });
  }
}
