import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthenticationModule } from 'src/authentication/authentication.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [AuthenticationModule, JwtModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
