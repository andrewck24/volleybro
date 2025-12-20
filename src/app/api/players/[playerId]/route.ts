/**
 * GET /api/players/{playerId} - Get Single Player
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/inversify.config';
import { TYPES } from '@/infrastructure/di/types';
import { getSession } from '@/lib/auth-client';
import { IGetPlayerUseCase } from '@/applications/usecases/player';
import { PlayerSchema } from '@/lib/validations/player';
import { ZodError } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    // Verify authentication
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const playerId = params.playerId;

    // Get use case from DI container
    const getPlayerUseCase = container.get<IGetPlayerUseCase>(
      TYPES.GetPlayerUseCase
    );

    // Execute use case
    const player = await getPlayerUseCase.execute(playerId);

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Validate response
    const validatedPlayer = PlayerSchema.parse(player);

    return NextResponse.json(
      { player: validatedPlayer },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid response data', details: error.errors },
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
