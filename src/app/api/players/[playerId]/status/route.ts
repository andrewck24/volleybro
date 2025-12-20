/**
 * PATCH /api/players/{playerId}/status - Update Player Status
 * Support for: accept invitation, reject invitation, leave team
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/inversify.config';
import { TYPES } from '@/infrastructure/di/types';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  IAcceptInvitationUseCase,
  IRejectInvitationUseCase,
  ILeaveTeamUseCase,
  ICancelInvitationUseCase,
} from '@/applications/usecases/player';
import { UpdatePlayerStatusSchema } from '@/lib/validations/player';
import { ZodError } from 'zod';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { playerId } = await params;

    // Parse and validate request body
    const body = await req.json();
    const validatedData = UpdatePlayerStatusSchema.parse(body);

    const { action } = validatedData;

    // Get appropriate use case from DI container and execute
    switch (action) {
      case 'accept': {
        const acceptUseCase = container.get<IAcceptInvitationUseCase>(
          TYPES.AcceptInvitationUseCase
        );
        await acceptUseCase.execute(playerId, userId);
        return NextResponse.json(
          { success: true, message: 'Invitation accepted' },
          { status: 200 }
        );
      }

      case 'reject': {
        const rejectUseCase = container.get<IRejectInvitationUseCase>(
          TYPES.RejectInvitationUseCase
        );
        await rejectUseCase.execute(playerId, userId);
        return NextResponse.json(
          { success: true, message: 'Invitation rejected' },
          { status: 200 }
        );
      }

      case 'leave': {
        const leaveUseCase = container.get<ILeaveTeamUseCase>(
          TYPES.LeaveTeamUseCase
        );
        await leaveUseCase.execute(playerId, userId);
        return NextResponse.json(
          { success: true, message: 'Left team successfully' },
          { status: 200 }
        );
      }

      case 'cancel': {
        const cancelUseCase = container.get<ICancelInvitationUseCase>(
          TYPES.CancelInvitationUseCase
        );
        await cancelUseCase.execute(playerId, userId);
        return NextResponse.json(
          { success: true, message: 'Invitation cancelled' },
          { status: 200 }
        );
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Player not found
      if (error.message.includes('not found') || error.message.includes('No player')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      // Validation errors (invalid status, etc.)
      if (error.message.includes('not invited') ||
          error.message.includes('Invalid') ||
          error.message.includes('already')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
