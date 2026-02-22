import {
  Controller,
  Get,
  Patch,
  UseGuards,
  Query,
  UploadedFile,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from 'src/common/guards/authentication.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageFilePipe } from 'src/common/pipes/image-file.pipe';
import type { ReqWithUser } from 'src/common/interfaces/reqWithUser';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req: ReqWithUser) {
    return this.usersService.findMe(req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Get()
  async find(
    @Query('email') email?: string,
    @Query('username') username?: string,
    @Query('id') id?: string,
  ) {
    const filter: { email?: string; username?: string; id?: string } = {};

    if (email) {
      filter.email = email;
    }

    if (username) {
      filter.username = username;
    }

    if (id) {
      filter.id = id;
    }
    // If filter is empty, return all users, otherwise find one
    if (Object.keys(filter).length === 0) {
      return this.usersService.findAll();
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.usersService.findOne(filter);
  }
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('profilePicture'))
  @Patch()
  update(
    @Req()
    req: ReqWithUser,
    @UploadedFile(new ImageFilePipe(true))
    file?: Express.Multer.File,
  ) {
    return this.usersService.update(req.currentUser.id, file);
  }
}
