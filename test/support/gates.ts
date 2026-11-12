const openGates: (() => void)[] = [];

/** A promise a handler awaits to hold its response in flight until `release` is called. */
export const deferred = () => {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => (release = resolve));
  openGates.push(release);
  return { promise, release };
};

export const barrier = (participants: number) => {
  const arrived = deferred();
  const released = deferred();
  let count = 0;
  return {
    ready: arrived.promise,
    wait: async () => {
      count += 1;
      if (count === participants) arrived.release();
      await released.promise;
    },
    release: released.release,
  };
};

/** Opens every gate a test left closed, which would keep its requests hanging past teardown. */
export const releaseGates = () => openGates.splice(0).forEach((open) => open());
