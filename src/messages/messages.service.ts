import { Injectable } from '@nestjs/common';
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
    });
    return newMessage;
  }

  async findAll(course_id: string) {
    return await this.prisma.messages.findMany({
      where: {
        course_id,
      },
    });
  }

  async getMessageSenderUsername(sender_id: string): Promise<string> {
    const user = await this.prisma.users.findUnique({
      where: {
        id: sender_id,
      },
    });

    if (!user) throw new Error('Internel Server Error');

    return user.username;
  }
  findOne(id: number) {
    return `This action returns a #${id} message`;
  }

  update(id: number, updateMessageDto: UpdateMessageDto) {
    return `This action updates a #${id} message`;
  }

  remove(id: number) {
    return `This action removes a #${id} message`;
  }
}
