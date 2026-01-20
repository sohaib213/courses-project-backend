import {
  Controller,
  Get,
  Body,
  Patch,
  UseGuards,
  Query,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from 'src/authentication/gurards/authentication.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @UseGuards(AuthGuard)
  @Get()
  async find(
    @Query('email') email?: string,
    @Query('username') username?: string,
    @Query('id') id?: string,
  ) {
    const filter: { email?: string; username?: string; id?: number } = {};

    if (email) {
      filter.email = email;
    }

    if (username) {
      filter.username = username;
    }

    if (id) {
      filter.id = +id;
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
    @Request()
    req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const id = req.currentUser.id;
    return this.usersService.update(+id, file);
  }
}
