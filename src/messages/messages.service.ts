import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMessageDto: CreateMessageDto, sender_id: string) {
    const { course_id, content } = createMessageDto;
    const newMessage = await this.prisma.messages.create({
      data: {
        course_id,
        content,
        sender_id,
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true,
            image: true,
          },
        },
      },
    });
    return newMessage;
  }

  async findAll(course_id: string) {
    return await this.prisma.messages.findMany({
      where: {
        course_id,
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdat: 'asc',
      },
    });
  }

  async getMessageSenderUsername(sender_id: string): Promise<string> {
    const user = await this.prisma.users.findUnique({
      where: {
        id: sender_id,
      },
    });
    if (!user) throw new Error('Internal Server Error');
    return user.username;
  }

  async findOne(id: string) {
    const message = await this.prisma.messages.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException(`Message with id ${id} not found`);
    }

    return message;
  }

  async update(
    id: string,
    updateMessageDto: UpdateMessageDto,
    currentUserId: string,
  ) {
    const message = await this.findOne(id);
    if (message.users.id !== currentUserId) {
      throw new ForbiddenException('You can only edit your own messages');
    }
    return await this.prisma.messages.update({
      where: { id },
      data: {
        content: updateMessageDto.content,
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async remove(id: string, currentUserId: string) {
    const message = await this.findOne(id);

    const isOwner = message.users.id === currentUserId;
    const teacher = await this.prisma.courses.findUnique({
      where: { id: message.course_id },
      select: {
        teacher_id: true,
      },
    });
    if (!isOwner && teacher?.teacher_id !== currentUserId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.messages.delete({
      where: { id },
    });

    return {
      message: 'Message deleted successfully',
    };
  }
}
