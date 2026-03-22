import type { Model } from "mongoose";

export function createMockDocument<T extends Record<string, unknown>>(
  data: T,
) {
  return {
    ...data,
    toJSON: jest.fn().mockReturnValue(data),
  };
}

interface ModelMocks {
  mockFind: jest.Mock;
  mockFindOne: jest.Mock;
  mockFindOneAndReplace: jest.Mock;
  mockFindOneAndDelete: jest.Mock;
}

export function setupModelMocks(mockModel: Model<unknown>): ModelMocks {
  const mockFind = jest.fn();
  const mockFindOne = jest.fn();
  const mockFindOneAndReplace = jest.fn();
  const mockFindOneAndDelete = jest.fn();

  mockModel.find = mockFind as typeof mockModel.find;
  mockModel.findOne = mockFindOne as typeof mockModel.findOne;
  mockModel.findOneAndReplace =
    mockFindOneAndReplace as typeof mockModel.findOneAndReplace;
  mockModel.findOneAndDelete =
    mockFindOneAndDelete as typeof mockModel.findOneAndDelete;

  return {
    mockFind,
    mockFindOne,
    mockFindOneAndReplace,
    mockFindOneAndDelete,
  };
}
