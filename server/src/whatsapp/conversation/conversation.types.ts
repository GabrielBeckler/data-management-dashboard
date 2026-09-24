export abstract class ConversationStateStore {
  abstract get(
    phone: string,
  ): { phone: string; state: string; step?: string; data?: Record<string, unknown> } | undefined;

  abstract set(
    phone: string,
    state: { phone: string; state: string; step?: string; data?: Record<string, unknown> },
  ): void;

  abstract delete(phone: string): void;
  abstract clear(): void;
}
