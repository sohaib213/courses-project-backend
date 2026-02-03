import { BadRequestException } from '@nestjs/common';

export function assertHasUpdatePayload(
  dto: object,
  files?: Array<Express.Multer.File | undefined>,
) {
  const hasDtoFields = Object.values(dto).some((value) => value !== undefined);

  const hasAnyFile = files && files.some((file) => !!file);

  if (!hasDtoFields && !hasAnyFile) {
    throw new BadRequestException('No data provided for update');
  }
}
