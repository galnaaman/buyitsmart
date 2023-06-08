const DOWNLOAD_FILE_TIMEOUT_MS = 60_000 * 3;

export const waitForPromiseOrTimeout = <T>(
  asyncFn: (signal: AbortSignal) => Promise<T>,
  rejectValue?: object,
  timeout?: number,
): Promise<T> => {
  const controller = new AbortController();

  return Promise.race([
    asyncFn(controller.signal),
    new Promise((_resolve, reject) => {
      setTimeout(() => {
        controller.abort();
        // eslint-disable-next-line prefer-promise-reject-errors
        if (rejectValue) reject({ ...rejectValue, timeout: true });
        // eslint-disable-next-line prefer-promise-reject-errors
        else reject();
      }, +(timeout ?? process.env.DOWNLOAD_FILE_TIMEOUT_MS ?? DOWNLOAD_FILE_TIMEOUT_MS));
    }),
  ]) as Promise<T>;
};

export function combineSignals (signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    signal.addEventListener('abort', () => {
      controller.abort(); // Cancel the composite signal when any of the signals are aborted
    });
  }

  return controller.signal;
}
