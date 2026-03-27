import {
  createMockAuthenticationService,
  createMockAuthorizationService,
  createMockRecordRepository,
  createRecord,
  createUser,
} from "@/__tests__/helpers";
import {
  CreateRallyUseCase,
  UpdateRallyUseCase,
} from "@/applications/usecases/record/rally.usecase";
import { FindRecordUseCase } from "@/applications/usecases/record/record.usecase";
import {
  CreateSetUseCase,
  UpdateSetUseCase,
} from "@/applications/usecases/record/set.usecase";
import { CreateSubstitutionUseCase } from "@/applications/usecases/record/substitution.usecase";
import { NotFoundError } from "@/entities/errors/app-error";
import { Rally, Set, Substitution } from "@/entities/record";
import { Lineup } from "@/entities/team";
import { beforeEach, describe, expect, it } from "@jest/globals";

let mockRecordRepository: ReturnType<typeof createMockRecordRepository>;
let mockAuthService: ReturnType<typeof createMockAuthenticationService>;
let mockAuthzService: ReturnType<typeof createMockAuthorizationService>;

beforeEach(() => {
  mockRecordRepository = createMockRecordRepository();
  mockAuthService = createMockAuthenticationService();
  mockAuthzService = createMockAuthorizationService();
  mockAuthService.verifySession.mockResolvedValue(createUser());
  mockAuthzService.verifyTeamRole.mockResolvedValue(undefined);
});

describe("CreateRallyUseCase", () => {
  it("throws NotFoundError when record not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue(undefined);
    const useCase = new CreateRallyUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { recordId: "record-1", setIndex: 0, entryIndex: 0 },
        data: {} as unknown as Rally,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when set not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue({
      ...createRecord(),
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
        data: {} as unknown as Rally,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("UpdateRallyUseCase", () => {
  it("throws NotFoundError when record not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue(undefined);
    const useCase = new UpdateRallyUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { recordId: "record-1", setIndex: 0, entryIndex: 0 },
        data: {} as unknown as Rally,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when set not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue({
      ...createRecord(),
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
        data: {} as unknown as Rally,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("FindRecordUseCase", () => {
  it("throws NotFoundError when record not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue(undefined);
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
    mockRecordRepository.findOne.mockResolvedValue(undefined);
    const useCase = new CreateSetUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { recordId: "record-1", setIndex: 0 },
        data: { lineup: {} as unknown as Lineup, options: {} as unknown as Set["options"] },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("UpdateSetUseCase", () => {
  it("throws NotFoundError when record not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue(undefined);
    const useCase = new UpdateSetUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { recordId: "record-1", setIndex: 0 },
        data: { options: {} as unknown as Set["options"] },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("CreateSubstitutionUseCase", () => {
  it("throws NotFoundError when record not found", async () => {
    mockRecordRepository.findOne.mockResolvedValue(undefined);
    const useCase = new CreateSubstitutionUseCase(
      mockRecordRepository,
      mockAuthService,
      mockAuthzService,
    );

    await expect(
      useCase.execute({
        params: { recordId: "record-1", setIndex: 0, entryIndex: 0 },
        data: {} as unknown as Substitution,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
