type State = "closed" | "open" | "half-open";

export class CircuitBreaker {
  private state: State = "closed";
  private failures = 0;
  private readonly threshold: number;
  private readonly cooldownMs: number;
  private nextTry = 0;

  constructor(opts: { threshold?: number; cooldownMs?: number } = {}) {
    this.threshold = opts.threshold ?? 5;
    this.cooldownMs = opts.cooldownMs ?? 10_000;
  }

  allow() {
    const now = Date.now();
    if (this.state === "open" && now >= this.nextTry) {
      this.state = "half-open";
      return true;
    }
    return this.state !== "open";
  }

  success() {
    this.state = "closed";
    this.failures = 0;
  }

  fail() {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.state = "open";
      this.nextTry = Date.now() + this.cooldownMs;
    }
  }
}
