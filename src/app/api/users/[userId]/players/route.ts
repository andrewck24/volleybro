/**
 * GET /api/users/{userId}/players - Retrieve all teams/players for a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/inversify.config';
import { TYPES } from '@/infrastructure/di/types';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { IGetUserPlayersUseCase } from '@/applications/usecases/player';
import { PlayerSchema } from '@/lib/validations/player';
import { ZodError } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
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

    const requestingUserId = session.user.id;
    const { userId: targetUserId } = await params;

    // Verify user can only access their own players
    if (requestingUserId !== targetUserId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot access other user\'s players' },
        { status: 403 }
      );
    }

    // Get use case from DI container
    const getUserPlayersUseCase = container.get<IGetUserPlayersUseCase>(
      TYPES.GetUserPlayersUseCase
    );

    // Execute use case
    const players = await getUserPlayersUseCase.execute(targetUserId);

    // Validate response
    const validatedPlayers = players.map((p) => PlayerSchema.parse(p));

    return NextResponse.json(
      { players: validatedPlayers },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid response data', details: error.issues },
        { status: 500 }
      );
    }

    if (error instanceof Error) {
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
