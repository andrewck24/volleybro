import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import {
  GetProfileUseCase,
  CreateProfileUseCase,
  UpdateProfileUseCase,
  type IGetProfileInput,
  type IGetProfileOutput,
  type ICreateProfileInput,
  type IUpdateProfileInput,
  type IUpdateProfileOutput,
} from "@/applications/usecases/user/profile.usecase";
import type { Profile } from "@/entities/profile";
import { z } from "zod";

// ============ Controller Layer Validation Schemas ============
// 格式與 Transport Validation：驗證 HTTP 請求格式與資料型別

/**
 * UpdateProfile 請求驗證 Schema
 * - 驗證資料格式與型別
 * - 拒絕未知欄位
 * - 確保 teams, info, preferences 格式正確
 */
export const UpdateProfileRequestSchema = z
  .object({
    activeTeamId: z.string().optional(),
    info: z.record(z.string(), z.unknown()).optional(),
    preferences: z.record(z.string(), z.unknown()).optional(),
  })
  .strict(); // 拒絕未知欄位

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

/**
 * Controller Layer Validation Error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export const getProfileController = async (
  input: IGetProfileInput,
): Promise<IGetProfileOutput> => {
  const getProfileUseCase = container.get<GetProfileUseCase>(
    TYPES.GetProfileUseCase,
  );
  return await getProfileUseCase.execute(input);
};

export const createProfileController = async (
  input: ICreateProfileInput,
): Promise<Profile | undefined> => {
  const createProfileUseCase = container.get<CreateProfileUseCase>(
    TYPES.CreateProfileUseCase,
  );
  const result = await createProfileUseCase.execute(input);
  if (!result.ok) {
    console.error("[createProfileController] Failed to create profile:", result.error);
    return undefined;
  }
  return result.value;
};

/**
 * Update Profile Controller
 * - 執行 Controller Layer 驗證（格式與型別）
 * - 委派給 Use Case 執行業務邏輯驗證
 * @throws {ValidationError} 當請求格式不正確時
 */
export const updateProfileController = async (
  input: IUpdateProfileInput,
): Promise<IUpdateProfileOutput> => {
  // Controller Layer Validation: 格式與 Transport Validation
  const validation = UpdateProfileRequestSchema.safeParse(input.updates);

  if (!validation.success) {
    throw new ValidationError("Invalid request format", validation.error.issues);
  }

  // 委派給 Use Case 執行業務邏輯
  const updateProfileUseCase = container.get<UpdateProfileUseCase>(
    TYPES.UpdateProfileUseCase,
  );
  return await updateProfileUseCase.execute({
    userId: input.userId,
    updates: validation.data,
  });
};