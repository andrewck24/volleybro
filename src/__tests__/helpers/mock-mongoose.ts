/** Wraps a value in a chainable `.exec()` mock for Mongoose query chains. */
export const mockExec = (val: unknown) => ({
  exec: jest.fn().mockResolvedValue(val),
});

/** Creates a mock Mongoose document with `.toObject()` returning the given data. */
export const mockDoc = (data: Record<string, unknown>) => ({
  toObject: jest.fn().mockReturnValue(data),
});
