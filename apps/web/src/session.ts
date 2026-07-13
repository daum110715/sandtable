/** DEV-025 客户端会话元数据（世界权威仍在服务端）。 */

const KEY = "sandtable.session.v1";

export interface ClientSession {
  readonly scenarioId: string;
  readonly customBackground?: string;
  readonly enteredAt: string;
}

export const loadClientSession = (): ClientSession | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ClientSession;
  } catch {
    return null;
  }
};

export const saveClientSession = (session: ClientSession): void => {
  localStorage.setItem(KEY, JSON.stringify(session));
};

export const clearClientSession = (): void => {
  localStorage.removeItem(KEY);
};
