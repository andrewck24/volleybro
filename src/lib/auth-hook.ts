import type { ILinkPendingInvitationsUseCase } from "@/applications/usecases/user/link-pending-invitations.usecase";
import type { CreateProfileUseCase } from "@/applications/usecases/user/profile.usecase";
import { TransientError } from "@/entities/errors/app-error";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

/**
 * Hook handler for Better Auth `user.create.after` event.
 *
 * Flow:
 * 1. Create Profile via CreateProfileUseCase (throws on failure)
 * 2. If profile creation succeeds, link pending email invitations via
 *    LinkPendingInvitationsUseCase with retry-once-on-transient-failure
 * 3. All failures are logged but do NOT propagate — the hook must not
 *    block the auth flow.
 */
export async function handleUserCreated(user: {
  id: string;
  email: string;
}): Promise<void> {
  const createProfileUseCase = container.get<CreateProfileUseCase>(
    TYPES.CreateProfileUseCase,
  );

  try {
    await createProfileUseCase.execute({ userId: user.id });
    console.log(`[Auth Hook] Profile created for user ${user.id}`);
  } catch (error) {
    console.error(
      `[Auth Hook] Failed to create profile for user ${user.id}:`,
      error,
    );
    return;
  }

  const linkUseCase = container.get<ILinkPendingInvitationsUseCase>(
    TYPES.LinkPendingInvitationsUseCase,
  );

  try {
    const count = await linkUseCase.execute({
      email: user.email,
      userId: user.id,
    });
    if (count > 0) {
      console.log(
        `[Auth Hook] Linked ${count} pending invitation(s) for ${user.email}`,
      );
    }
  } catch (firstError) {
    if (firstError instanceof TransientError) {
      console.warn(
        `[Auth Hook] Transient error linking invitations, retrying once...`,
      );
      try {
        const count = await linkUseCase.execute({
          email: user.email,
          userId: user.id,
        });
        if (count > 0) {
          console.log(
            `[Auth Hook] Linked ${count} pending invitation(s) for ${user.email}`,
          );
        }
      } catch (retryError) {
        console.error(
          `[Auth Hook] Failed to link pending invitations for ${user.email}:`,
          retryError,
        );
      }
    } else {
      console.error(
        `[Auth Hook] Failed to link pending invitations for ${user.email}:`,
        firstError,
      );
    }
  }
}
