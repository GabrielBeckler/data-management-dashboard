import { Module } from '@nestjs/common';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { ConversationService } from './conversation/conversation.service';
import { InMemoryConversationStateStore } from './conversation/conversation.state';
import { ConversationStateStore } from './conversation/conversation.types';
import { MenuService } from './menu/menu.service';
import { WhatsAppClient } from './whatsapp.client';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppEvents } from './whatsapp.events';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [GoogleCalendarModule],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppClient,
    WhatsAppService,
    MenuService,
    ConversationService,
    WhatsAppEvents,
    InMemoryConversationStateStore,
    {
      provide: ConversationStateStore,
      useClass: InMemoryConversationStateStore,
    },
  ],
  exports: [WhatsAppService, WhatsAppClient],
})
export class WhatsAppModule {}
