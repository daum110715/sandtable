import { Agent } from "@earendil-works/pi-agent-core";
import type { createAgentSession } from "@earendil-works/pi-coding-agent";
import type { Api, Model } from "@earendil-works/pi-ai";

export const piRuntime = {
  Agent
};

export type PiModel = Model<Api>;
export type PiSessionFactory = typeof createAgentSession;
