import type { ILinkPendingInvitationsUseCase } from "@/applications/usecases/user/link-pending-invitations.usecase";
import { TransientError } from "@/entities/errors";
import { container } from "@/infrastructure/di/inversify.config";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { TYPES } from "@/infrastructure/di/types";

/**
 * Hook handler for Better Auth `user.create.after` event.
 *
 * Flow:
 * 1. Link pending email invitations via LinkPendingInvitationsUseCase, with
 *    retry-once-on-transient-failure.
 * 2. All failures are logged but do NOT propagate — the hook must not
 *    block the auth flow.
 */
export async function handleUserCreated(user: {
  id: string;
  email: string;
}): Promise<void> {
  try {
    await connectToMongoDB();
  } catch (error) {
    console.error(
      `[Auth Hook] Failed to connect to MongoDB for user ${user.id}:`,
      error,
    );
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
