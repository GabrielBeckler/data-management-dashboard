import { Injectable } from '@nestjs/common';
import { whatsappMenu } from './menu.config';
import { WhatsAppMenuItem } from './menu.types';

@Injectable()
export class MenuService {
  getMenu(): WhatsAppMenuItem[] {
    return whatsappMenu;
  }

  getMenuText(): string {
    return this.getMenu()
      .map((item) => `${item.title} - ${item.description}`)
      .join('\n');
  }
}
