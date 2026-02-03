import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PrismaService } from 'prisma/prisma.service';
import { assertHasUpdatePayload } from 'src/common/utils/checkDataToUpdate';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}
  create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.categories.create({
      data: createCategoryDto,
    });
  }

  findAll() {
    return this.prisma.categories.findMany();
  }

  findOne(id: string) {
    return this.prisma.categories.findUnique({
      where: { id },
    });
  }

  update(id: string, name: string) {
    assertHasUpdatePayload({ name });
    return this.prisma.categories.update({
      where: { id },
      data: { name },
    });
  }
  remove(id: string) {
    return this.prisma.categories.delete({
      where: { id },
    });
  }
}
