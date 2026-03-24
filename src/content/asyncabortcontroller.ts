export class AsyncAbortController implements AbortController {
  #abortController: AbortController;

  readonly promise: Promise<void>;
  readonly #resolve: () => void;

  constructor() {
    const { promise, resolve } = Promise.withResolvers<void>();
    this.promise = promise;
    this.#resolve = resolve;

    this.#abortController = new AbortController();
    this.#abortController.signal.addEventListener('abort', () => {
      this.#resolve();
    });
  }

  /** @override */
  get signal(): AbortSignal {
    return this.#abortController.signal;
  }

  /** @override */
  abort(): void {
    this.#abortController.abort();
  }
}
