import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddItemDto } from './dto/AddItem.dto';
import type { ReqWithUser } from 'src/common/interfaces/reqWithUser';
import { AuthGuard } from 'src/common/guards/authentication.guard';

@UseGuards(AuthGuard)
@Controller('carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('item')
  addItem(@Body() createCartDto: AddItemDto, @Req() req: ReqWithUser) {
    return this.cartService.addItem(createCartDto, req.currentUser.id);
  }

  @Get()
  findAllUserCarts(@Req() req: ReqWithUser) {
    return this.cartService.findAllUserCarts(req.currentUser.id);
  }

  @Get('active')
  findActiveCart(@Req() req: ReqWithUser) {
    return this.cartService.findUserActiveCart(req.currentUser.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: ReqWithUser) {
    return this.cartService.findCartById(id, req.currentUser.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: ReqWithUser) {
    return this.cartService.removeItem(id, req.currentUser.id);
  }

  @Get(':id/items')
  findItemsInCart(@Req() req: ReqWithUser, @Param('id') cart_id: string) {
    return this.cartService.findItemsInCart(cart_id, req.currentUser.id);
  }

  @Post('pay')
  pay(@Req() req: ReqWithUser) {
    console.log(0);
    return this.cartService.pay(req.currentUser.id);
  }
}
