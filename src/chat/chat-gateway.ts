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
import { CoursesService } from 'src/courses/courses.service';

export const ChatEvents = {
  JOIN_COURSE: 'join-course',
  LEAVE_COURSE: 'leave-course',
  COURSE_MESSAGE: 'course-message',
  NEW_MESSAGE: 'new-message',
  UPDATE_MESSAGE: 'update-message',
  MESSAGE_UPDATED: 'message-updated',
  MESSAGE_DELETED: 'message-deleted',
  Error: 'chat-error',
  JOINED_COURSE: 'joined-course',
  LEFT_COURSE: 'left-course',
};

type UpdateMessagePayload = {
  courseId: string;
  messageId: string;
  content: string;
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
    private readonly coursesService: CoursesService,
  ) {}

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  @SubscribeMessage(ChatEvents.JOIN_COURSE)
  async handleJoinCourse(
    client: AuthenticatedSocket,
    payload: { courseId: string },
  ) {
    const canAccess = await this.canAccessCourseChat(
      payload.courseId,
      client.data.user.id,
    );

    if (!canAccess) {
      client.emit(ChatEvents.Error, 'Access denied');
      return;
    }

    if (client.rooms.has(payload.courseId)) return;

    await client.join(payload.courseId);

    const previousMessages = await this.messagesService.findAll(
      payload.courseId,
    );

    this.clients.set(client.id, client.data.user.username);

    const mappedMessages = await Promise.all(
      previousMessages.map(async (message) => {
        let username: string;
        if (this.clients.has(message.sender_id)) {
          username = this.clients.get(message.sender_id);
        } else {
          username = await this.messagesService.getMessageSenderUsername(
            message.sender_id,
          );
          this.clients.set(message.sender_id, username);
        }
        return {
          id: message.id,
          content: message.content,
          username,
          time: message.createdat.toLocaleTimeString(),
          sender_id: message.sender_id,
        };
      }),
    );

    client.emit(ChatEvents.JOINED_COURSE, {
      course_id: payload.courseId,
      previousMessages: mappedMessages,
    });
  }

  private async canAccessCourseChat(courseId: string, userId: string) {
    const isEnrolled = await this.enrollmentsService.isEnrolled(
      courseId,
      userId,
    );
    if (isEnrolled) return true;

    const course = await this.coursesService.findOne(courseId);
    const teacherId = course?.teacher?.id;
    return String(teacherId) === String(userId);
  }

  @SubscribeMessage(ChatEvents.LEAVE_COURSE)
  async handleLeaveCourse(
    client: AuthenticatedSocket,
    payload: { courseId: string },
  ) {
    await client.leave(payload.courseId);
    client.emit(ChatEvents.LEFT_COURSE, payload.courseId);
  }

  @SubscribeMessage(ChatEvents.COURSE_MESSAGE)
  async handleCourseMessage(
    client: AuthenticatedSocket,
    payload: CourseMessageDto,
  ) {
    const userId = client.data.user.id;
    const canAccess = await this.canAccessCourseChat(payload.courseId, userId);

    if (!canAccess) {
      client.emit(ChatEvents.Error, 'Access denied');
      return;
    }

    const message = await this.messagesService.create(
      { course_id: payload.courseId, content: payload.content },
      userId,
    );

    this.server.to(payload.courseId).emit(ChatEvents.NEW_MESSAGE, {
      message: { ...message, id: message.id },
      username: client.data.user.username,
    });
  }

  @SubscribeMessage(ChatEvents.UPDATE_MESSAGE)
  async handleUpdateMessage(
    client: AuthenticatedSocket,
    payload: UpdateMessagePayload,
  ) {
    const userId = client.data.user.id;
    const canAccess = await this.canAccessCourseChat(payload.courseId, userId);

    if (!canAccess) {
      client.emit(ChatEvents.Error, 'Access denied');
      return;
    }

    const nextContent = String(payload.content || '').trim();
    if (!nextContent) {
      client.emit(ChatEvents.Error, 'Message content is required');
      return;
    }

    try {
      // messagesService.update should verify owner/permissions
      const updated = await this.messagesService.update(
        payload.messageId,
        {
          content: nextContent,
        },
        userId,
      );

      this.server.to(payload.courseId).emit(ChatEvents.MESSAGE_UPDATED, {
        messageId: updated.id,
        content: updated.content,
        sender_id: updated.sender_id,
      });
    } catch {
      client.emit(ChatEvents.Error, 'Failed to update message');
    }
  }

  @SubscribeMessage(ChatEvents.MESSAGE_DELETED)
  async handleMessageDeleted(
    client: AuthenticatedSocket,
    payload: { courseId: string; messageId: string },
  ) {
    const userId = client.data.user.id;
    const canAccess = await this.canAccessCourseChat(payload.courseId, userId);

    if (!canAccess) {
      client.emit(ChatEvents.Error, 'Access denied');
      return;
    }

    await this.messagesService.remove(payload.messageId, userId);

    this.server.to(payload.courseId).emit(ChatEvents.MESSAGE_DELETED, {
      messageId: payload.messageId,
    });
  }
}
