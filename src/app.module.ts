import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthenticationModule } from './authentication/authentication.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { CategoriesModule } from './categories/categories.module';
import { LessonsModule } from './lessons/lessons.module';
import { ChatModule } from './chat/chat.module';
import { MessagesModule } from './messages/messages.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { CartModule } from './cart/cart.module';
import { ScheduleModule } from '@nestjs/schedule';
import { GlobalExceptionFilter } from './common/filters/globalExceptionFilter';
import { APP_FILTER } from '@nestjs/core';
import { QuestionsModule } from './questions/questions.module';
import { QuizSubmissionsModule } from './submission/submission.module';
import { AiModule } from './ai/ai.module';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { ThrottlerModule, ThrottlerGuard, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import Redis from 'ioredis';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        stores: [new KeyvRedis(process.env.REDIS_URL)],
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: seconds(1), limit: 5 }, // 3 req/sec
        { name: 'medium', ttl: seconds(10), limit: 20 }, // 20 req/10s
        { name: 'long', ttl: seconds(60), limit: 100 }, // 100 req/min
      ],
      storage: new ThrottlerStorageRedisService(
        new Redis(process.env.REDIS_URL),
      ),
    }),
    AuthenticationModule,
    PrismaModule,
    CloudinaryModule,
    UsersModule,
    CoursesModule,
    CategoriesModule,
    LessonsModule,
    ChatModule,
    MessagesModule,
    EnrollmentsModule,
    CartModule,
    ScheduleModule.forRoot(),
    QuestionsModule,
    QuizSubmissionsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
