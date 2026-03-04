import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  UseGuards,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddItemDto } from './dto/AddItem.dto';
import type { ReqWithUser } from 'src/common/interfaces/reqWithUser';
import { AuthGuard } from 'src/common/guards/authentication.guard';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { IdParamDto } from 'src/common/dtos/idParam.dto';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('carts')
export class CartController {
  private stripe: Stripe;
  constructor(
    private readonly cartService: CartService,
    private config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_API_KEY'));
  }
  @UseGuards(AuthGuard)
  @Post('item')
  addItem(@Body() createCartDto: AddItemDto, @Req() req: ReqWithUser) {
    return this.cartService.addItem(createCartDto, req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAllUserCarts(@Req() req: ReqWithUser) {
    return this.cartService.findAllUserCarts(req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Get('active')
  findActiveCart(@Req() req: ReqWithUser) {
    return this.cartService.findUserActiveCart(req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Get('payments')
  getPayments(@Req() req: ReqWithUser) {
    return this.cartService.getPayments(req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param() { id }: IdParamDto, @Req() req: ReqWithUser) {
    return this.cartService.findCartById(id, req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param() { id }: IdParamDto, @Req() req: ReqWithUser) {
    return this.cartService.removeItem(id, req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Get('active/items')
  async findItemsInActiveCart(@Req() req: ReqWithUser) {
    const cart_id = (
      await this.cartService.findUserActiveCart(req.currentUser.id)
    ).id;
    return this.cartService.findItemsInCart(cart_id, req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Get(':id/items')
  findItemsInCart(
    @Req() req: ReqWithUser,
    @Param() { id: cart_id }: IdParamDto,
  ) {
    return this.cartService.findItemsInCart(cart_id, req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Post('pay')
  pay(@Req() req: ReqWithUser) {
    return this.cartService.pay(req.currentUser.id);
  }

  @SkipThrottle()
  @Post('webhooks')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const endpointSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        req.body as Buffer | string,
        signature,
        endpointSecret,
      );
    } catch (err) {
      if (err instanceof Error)
        console.error('Webhook signature verification failed:', err.message);
      return { received: false };
    }

    // Everything else handled in service
    await this.cartService.handleWebhookEvent(event);

    return { received: true };
  }
}
