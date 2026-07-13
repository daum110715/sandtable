import { systemIdentity, type WorkerStatus } from "@sandtable/domain";

export function getWorkerStatus(): WorkerStatus {
  return {
    name: `${systemIdentity.name}-worker`,
    status: "ready",
    protocolVersion: systemIdentity.protocolVersion,
  };
}
