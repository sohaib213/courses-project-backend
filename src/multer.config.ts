// import { BadRequestException } from '@nestjs/common';
// import { memoryStorage } from 'multer';

// export const imageUploadConfig = {
//   storage: memoryStorage(),
//   fileFilter: (_, file, callback) => {
//     if (!file.mimetype.startsWith('image/')) {
//       return callback(
//         new BadRequestException('Only image files are allowed'),
//         false,
//       );
//     }
//     callback(null, true);
//   },
//   limits: {
//     fileSize: 2 * 1024 * 1024, // 2MB
//   },
// };
