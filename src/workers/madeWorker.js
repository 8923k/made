import { computeBestResult } from '../utils/madeCore.js';

// Stateless worker: each message carries everything needed for one madeKey,
// so stale runs can be safely ignored by the main thread.
self.onmessage = (e) => {
  const msg = e.data;
  if (!msg || msg.type !== 'compute') return;
  const { runId, key, arrList, consts, patternLength } = msg;
  const env = { consts, compareCache: {}, patternLength };
  const result = computeBestResult(env, key, arrList);
  self.postMessage({ type: 'result', runId, key, result });
};
