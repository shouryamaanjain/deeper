export const Metrics = {
  sessionsCreated: 0,
  parallelCalls: 0,
  retries: 0,
  failures: 0,
  markSessionCreated() {
    this.sessionsCreated += 1;
  },
  markParallelCall() {
    this.parallelCalls += 1;
  },
  markRetry() {
    this.retries += 1;
  },
  markFailure() {
    this.failures += 1;
  },
};
