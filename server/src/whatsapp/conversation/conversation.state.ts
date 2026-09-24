import { ConversationState } from '../whatsapp.types';
import { ConversationStateStore } from './conversation.types';

export class InMemoryConversationStateStore implements ConversationStateStore {
  private states = new Map<string, ConversationState>();

  get(phone: string): ConversationState | undefined {
    return this.states.get(phone);
  }

  set(phone: string, state: ConversationState): void {
    this.states.set(phone, {
      ...state,
      updatedAt: new Date(),
    });
  }

  delete(phone: string): void {
    this.states.delete(phone);
  }

  clear(): void {
    this.states.clear();
  }
}
