import type { IRecordRepository } from "@/applications/repositories/record.repository.interface";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError } from "@/entities/errors/app-error";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CreateRallyUseCase } from "../rally.usecase";
import { UpdateRallyUseCase } from "../rally.usecase";
import { FindRecordUseCase } from "../record.usecase";
import { CreateSetUseCase } from "../set.usecase";
import { UpdateSetUseCase } from "../set.usecase";
import { CreateSubstitutionUseCase } from "../substitution.usecase";

const mockRecord = {
  _id: "record-1",
  team_id: "team-1",
  sets: [{ entries: [], lineups: { home: {} } }],
};

const mockAuthService = {
  verifySession: jest.fn().mockResolvedValue({ _id: "user-1" }),
} as any;

const mockAuthzService = {
  verifyTeamRole: jest.fn().mockResolvedValue(undefined),
} as any;

let mockRecordRepository: jest.Mocked<IRecordRepository>;

beforeEach(() => {
  mockRecordRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  } as any;
});

describe("CreateRallyUseCase", () => {
  it("throws NotFoundError when record not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue(null);
    const useCase = new CreateRallyUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { recordId: "record-1", setIndex: 0, entryIndex: 0 },
        data: {} as any,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when set not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue({
      ...mockRecord,
      sets: [],
    });
    const useCase = new CreateRallyUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { recordId: "record-1", setIndex: 0, entryIndex: 0 },
        data: {} as any,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("UpdateRallyUseCase", () => {
  it("throws NotFoundError when record not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue(null);
    const useCase = new UpdateRallyUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { recordId: "record-1", setIndex: 0, entryIndex: 0 },
        data: {} as any,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when set not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue({
      ...mockRecord,
      sets: [],
    });
    const useCase = new UpdateRallyUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { recordId: "record-1", setIndex: 0, entryIndex: 0 },
        data: {} as any,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("FindRecordUseCase", () => {
  it("throws NotFoundError when record not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue(null);
    const useCase = new FindRecordUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({ params: { _id: "record-1" } }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("CreateSetUseCase", () => {
  it("throws NotFoundError when record not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue(null);
    const useCase = new CreateSetUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { recordId: "record-1", setIndex: 0 },
        data: { lineup: {} as any, options: {} as any },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("UpdateSetUseCase", () => {
  it("throws NotFoundError when record not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue(null);
    const useCase = new UpdateSetUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { recordId: "record-1", setIndex: 0 },
        data: { options: {} as any },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("CreateSubstitutionUseCase", () => {
  it("throws NotFoundError when record not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue(null);
    const useCase = new CreateSubstitutionUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { recordId: "record-1", setIndex: 0, entryIndex: 0 },
        data: {} as any,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
