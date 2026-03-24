import "./jest.setup.shared";

function createMockObjectId() {
  return jest.fn().mockImplementation((id) => ({
    toString: () => id || "mock-object-id",
    toHexString: () => id || "mock-object-id",
  }));
}

// Avoid ES module issues with MongoDB driver
jest.mock("mongodb", () => ({
  MongoClient: {
    connect: jest.fn().mockResolvedValue({
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          find: jest
            .fn()
            .mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
          findOne: jest.fn().mockResolvedValue(null),
          insertOne: jest.fn().mockResolvedValue({ insertedId: "mock-id" }),
          updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
          deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
        }),
      }),
      close: jest.fn(),
    }),
  },
  ObjectId: createMockObjectId(),
}));

jest.mock("mongoose", () => {
  const mockObjectId = createMockObjectId();

  const mockSchema = jest.fn().mockImplementation(() => ({
    index: jest.fn(),
    plugin: jest.fn(),
    pre: jest.fn(),
    post: jest.fn(),
    virtual: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    }),
    virtualpath: jest.fn(),
    virtuals: {},
    methods: {},
    statics: {},
    getIndexes: jest.fn().mockReturnValue([]),
  }));

  Object.assign(mockSchema, {
    Types: { ObjectId: mockObjectId },
  });

  const mockModel = {
    find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    findById: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    findOne: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    create: jest.fn().mockResolvedValue({ _id: "mock-id" }),
    findByIdAndUpdate: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    findByIdAndDelete: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    countDocuments: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
  };

  return {
    connect: jest.fn().mockResolvedValue({}),
    disconnect: jest.fn().mockResolvedValue({}),
    connection: {
      readyState: 1,
      on: jest.fn(),
      once: jest.fn(),
    },
    Schema: mockSchema,
    model: jest.fn().mockReturnValue(mockModel),
    models: {},
    Types: { ObjectId: mockObjectId },
  };
});

jest.mock("bson", () => ({
  ObjectId: createMockObjectId(),
}));
