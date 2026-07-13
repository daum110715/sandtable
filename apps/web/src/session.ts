/** DEV-025 客户端会话元数据（世界权威仍在服务端）。 */

const SESSION_KEY = "sandtable.session.v1";

export interface ClientSession {
  readonly scenarioId: string;
  readonly customBackground?: string;
  readonly enteredAt: string;
}

export const loadClientSession = (): ClientSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ClientSession;
  } catch {
    return null;
  }
};

export const saveClientSession = (session: ClientSession): void => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearClientSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
};
