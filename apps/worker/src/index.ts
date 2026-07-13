import { getWorkerStatus } from "./status.js";

const status = getWorkerStatus();
process.stdout.write(`${JSON.stringify(status)}\n`);
