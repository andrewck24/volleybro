import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import type { CreateProfileUseCase } from "@/applications/usecases/user/profile.usecase";
import type { LinkPendingInvitationsUseCase } from "@/applications/usecases/user/link-pending-invitations.usecase";

/**
 * Hook handler for Better Auth `user.create.after` event.
 *
 * Flow:
 * 1. Create Profile via CreateProfileUseCase (returns Result<Profile>)
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
    TYPES.CreateProfileUseCase
  );

  const profileResult = await createProfileUseCase.execute({ userId: user.id });

  if (profileResult.ok === false) {
    console.error(
      `[Auth Hook] Failed to create profile for user ${user.id}:`,
      profileResult.error
    );
    return;
  }

  console.log(`[Auth Hook] Profile created for user ${user.id}`);

  const linkUseCase = container.get<LinkPendingInvitationsUseCase>(
    TYPES.LinkPendingInvitationsUseCase
  );

  let linkResult = await linkUseCase.execute(user.email, user.id);

  if (linkResult.ok === false && linkResult.error.isTransient) {
    console.warn(
      `[Auth Hook] Transient error linking invitations, retrying once...`
    );
    linkResult = await linkUseCase.execute(user.email, user.id);
  }

  if (linkResult.ok === false) {
    console.error(
      `[Auth Hook] Failed to link pending invitations for ${user.email}:`,
      linkResult.error
    );
    return;
  }

  if (linkResult.ok === true && linkResult.value > 0) {
    console.log(
      `[Auth Hook] Linked ${linkResult.value} pending invitation(s) for ${user.email}`
    );
  }
}
