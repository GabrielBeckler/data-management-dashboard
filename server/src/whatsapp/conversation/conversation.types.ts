import { ConversationState } from '../whatsapp.types';

export abstract class ConversationStateStore {
  abstract get(phone: string): ConversationState | undefined;

  abstract set(phone: string, state: ConversationState): void;

  abstract delete(phone: string): void;
  abstract clear(): void;
}
