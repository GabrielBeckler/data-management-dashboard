import { Injectable } from '@nestjs/common';
import { ConversationState } from '../whatsapp.types';
import { ConversationStateStore } from './conversation.types';

@Injectable()
export class ConversationService {
  constructor(private readonly stateStore: ConversationStateStore) {}

  getOrCreateState(phone: string): ConversationState {
    const existing = this.stateStore.get(phone);

    if (existing) {
      return existing;
    }

    const initialState: ConversationState = {
      phone,
      state: 'welcome',
      step: 'initial',
      data: {},
    };

    this.stateStore.set(phone, initialState);
    return initialState;
  }

  async processIncomingMessage(phone: string, message: string): Promise<string> {
    const state = this.getOrCreateState(phone);

    state.state = 'welcome';
    state.step = 'initial';
    state.data = { ...(state.data ?? {}), lastMessage: message };

    this.stateStore.set(phone, state);

    return [
      'Olá! Seja bem-vindo à Ótica.',
      '',
      'Escolha uma opção:',
      '1 - Agendamento',
      '2 - Atendimento',
      '3 - Dúvidas',
    ].join('\n');
  }
}
