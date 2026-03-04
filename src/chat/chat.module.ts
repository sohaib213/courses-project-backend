import { Module } from '@nestjs/common';
import { ChatGateway } from './chat-gateway';
import { MessagesModule } from 'src/messages/messages.module';
import { WsAuthGuard } from 'src/common/guards/ws-jwt.guard';
import { AuthenticationModule } from 'src/authentication/authentication.module';
import { EnrollmentsModule } from 'src/enrollments/enrollments.module';
import { CoursesModule } from 'src/courses/courses.module';

@Module({
  imports: [
    AuthenticationModule,
    MessagesModule,
    EnrollmentsModule,
    CoursesModule,
  ],
  providers: [ChatGateway, WsAuthGuard],
  exports: [ChatGateway],
})
export class ChatModule {}
