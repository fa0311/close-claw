type ProgressLogger<T> = {
  add: (item: T) => void;
  stop: () => Promise<void>;
};

export const createProgressLogger = async <T>(
  updateFn: (messages: T[]) => Promise<void>,
  callbackFn: (logger: ProgressLogger<T>) => Promise<void>,
) => {
  const list: T[] = [];
  let updateRequested = false;
  let stopped = false;
  let updateInFlight: Promise<void> | undefined;

  const update = async () => {
    if (!updateRequested) {
      return;
    }

    updateRequested = false;
    await updateFn([...list]);
  };

  const scheduleUpdate = () => {
    if (updateInFlight !== undefined || stopped) {
      return;
    }

    updateInFlight = update().finally(() => {
      updateInFlight = undefined;
    });
  };

  const interval = setInterval(() => {
    scheduleUpdate();
  }, 1200);

  const stop = async () => {
    stopped = true;
    clearInterval(interval);

    if (updateInFlight !== undefined) {
      await updateInFlight;
    }

    await update();
  };

  try {
    await callbackFn({
      add: (item: T) => {
        list.push(item);
        updateRequested = true;
      },
      stop,
    });
  } finally {
    if (!stopped) {
      await stop();
    }
  }
};
