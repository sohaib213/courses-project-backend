import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from '../messages/messages.service';
import { UseGuards } from '@nestjs/common';
import { WsAuthGuard } from 'src/common/guards/ws-jwt.guard';
import { EnrollmentsService } from 'src/enrollments/enrollments.service';
import { CourseMessageDto } from './dto/message.dto';

export const ChatEvents = {
  JOIN_COURSE: 'join-course',
  LEAVE_COURSE: 'leave-course',
  COURSE_MESSAGE: 'course-message',
  NEW_MESSAGE: 'new-message',
  Error: 'chat-error',
  JOINED_COURSE: 'joined-course',
  LEFT_COURSE: 'left-course',
};

export interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      username: string;
    };
  };
}

@UseGuards(WsAuthGuard)
@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clients: Map<string, string> = new Map();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  // Join course room
  @SubscribeMessage(ChatEvents.JOIN_COURSE)
  async handleJoinCourse(
    client: AuthenticatedSocket,
    payload: { courseId: string },
  ) {
    const isEnrolled = await this.enrollmentsService.isEnrolled(
      payload.courseId,
      client.data.user.id,
    );

    if (!isEnrolled) {
      client.emit(ChatEvents.Error, 'Access denied');
      return;
    }

    if (client.rooms.has(payload.courseId)) {
      return;
    }

    await client.join(payload.courseId);
    const previousMessages = await this.messagesService.findAll(
      payload.courseId,
    );
    this.clients.set(client.id, client.data.user.username);

    const mappedMessages = await Promise.all(
      previousMessages.map(async (message) => {
        let username: string;
        if (this.clients.has(client.data.user.id))
          username = this.clients.get(message.sender_id);
        else {
          username = await this.messagesService.getMessageSenderUsername(
            message.sender_id,
          );
          this.clients.set(message.sender_id, username);
        }
        return {
          content: message.content,
          username,
          time: message.createdat.toLocaleTimeString(),
        };
      }),
    );
    client.emit(ChatEvents.JOINED_COURSE, {
      course_id: payload.courseId,
      previousMessages: mappedMessages,
    });
  }

  // Leave course room
  @SubscribeMessage(ChatEvents.LEAVE_COURSE)
  async handleLeaveCourse(
    client: AuthenticatedSocket,
    payload: { courseId: string },
  ) {
    await client.leave(payload.courseId);
    client.emit(ChatEvents.LEFT_COURSE, payload.courseId);
  }

  // Handle sending message to course room
  @SubscribeMessage(ChatEvents.COURSE_MESSAGE)
  async handleCourseMessage(
    client: AuthenticatedSocket,
    payload: CourseMessageDto,
  ) {
    const userId: string = client.data.user.id;

    const isEnrolled = await this.enrollmentsService.isEnrolled(
      payload.courseId,
      userId,
    );

    if (!isEnrolled) {
      client.emit(ChatEvents.Error, 'Access denied');
      return;
    }

    const message = await this.messagesService.create(
      {
        course_id: payload.courseId,
        content: payload.content,
      },
      userId,
    );

    this.server.to(payload.courseId).emit(ChatEvents.NEW_MESSAGE, {
      message,
      username: client.data.user.username,
    });
  }
}
