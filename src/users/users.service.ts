import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ProfilePictureUrl } from 'src/common/assets/UserProfilePic';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}
  findAll() {
    return this.prisma.users.findMany({
      select: this.userPublicProberties,
    });
  }

  async findOne(filter: { id?: string; email?: string; username?: string }) {
    if (!filter.id && !filter.email && !filter.username) {
      throw new BadRequestException('ID, email, or username is required');
    }

    let user;

    // findUnique requires exactly ONE unique field at a time
    if (filter.id) {
      user = await this.prisma.users.findUnique({
        where: { id: filter.id },
        select: this.userPublicProberties,
      });
    } else if (filter.email) {
      user = await this.prisma.users.findUnique({
        where: { email: filter.email },
        select: this.userPublicProberties,
      });
    } else if (filter.username) {
      user = await this.prisma.users.findUnique({
        where: { username: filter.username },
        select: this.userPublicProberties,
      });
    }

    if (!user) {
      const identifier = filter.id
        ? `ID ${filter.id}`
        : filter.email
          ? `email "${filter.email}"`
          : `username "${filter.username}"`;
      throw new NotFoundException(`User with ${identifier} not found`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }

  async update(id: string, file?: Express.Multer.File) {
    const currentUser: { image: string } = await this.prisma.users.findUnique({
      where: { id },
      select: { image: true },
    });

    if (!currentUser) throw new NotFoundException('User with id not found');

    let profilePictureUrl: string = currentUser.image;
    if (file) {
      try {
        const result = await this.cloudinaryService.uploadFile(
          file,
          'users/profiles',
        );
        profilePictureUrl = result.secure_url;
      } catch {
        throw new BadRequestException('Failed to upload profile picture');
      }
    }

    const updatedUser = await this.prisma.users.update({
      where: { id },
      data: { image: profilePictureUrl },
      select: this.userPublicProberties,
    });

    const oldPublicId = this.cloudinaryService.extractPublicId(
      currentUser.image,
    );
    if (oldPublicId) {
      this.cloudinaryService.deleteFile(oldPublicId).catch(() => {
        console.error(`Failed to delete old image: ${oldPublicId}`);
      });
    }

    return updatedUser;
  }

  remove(id: string) {
    return `This action removes a #${id} user`;
  }
  userPublicProberties = {
    id: true,
    email: true,
    username: true,
    type: true,
    image: true,
    points: true,
    createdat: true,
  };
}
