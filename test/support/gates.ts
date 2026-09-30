const openGates: (() => void)[] = [];

/** A promise a handler awaits to hold its response in flight until `release` is called. */
export const deferred = () => {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => (release = resolve));
  openGates.push(release);
  return { promise, release };
};

/** Opens every gate a test left closed, which would keep its requests hanging past teardown. */
export const releaseGates = () => openGates.splice(0).forEach((open) => open());
