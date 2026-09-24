import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SendMessageDto } from './dto/send-message.dto';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  async connect() {
    return this.whatsappService.connect();
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnect() {
    return this.whatsappService.disconnect();
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(@Body() payload: SendMessageDto) {
    return this.whatsappService.sendMessage(payload);
  }
}
