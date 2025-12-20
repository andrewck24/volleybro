/**
 * POST /api/teams/{teamId}/players - Create Invitation or Pure Player
 * GET /api/teams/{teamId}/players - List all players in team
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/inversify.config';
import { TYPES } from '@/infrastructure/di/types';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  ICreateInvitationUseCase,
  IGetTeamPlayersUseCase,
  ICreatePlayerUseCase,
} from '@/applications/usecases/player';
import {
  CreatePlayerSchema,
  PlayerSchema,
} from '@/lib/validations/player';
import { ZodError } from 'zod';
import type { Player } from '@/entities/player';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
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
    const { teamId } = await params;

    // Parse and validate request body
    const body = await req.json();
    const validatedData = CreatePlayerSchema.parse(body);

    // If email is provided, create an invitation (US1)
    // Otherwise, create a pure player (US4)
    if (validatedData.email) {
      const createInvitationUseCase = container.get<ICreateInvitationUseCase>(
        TYPES.CreateInvitationUseCase
      );

      const playerId = await createInvitationUseCase.execute(
        teamId,
        validatedData.email.toLowerCase(),
        validatedData.role || '',
        userId
      );

      return NextResponse.json({ playerId }, { status: 201 });
    }

    // Create pure player without email
    const createPlayerUseCase = container.get<ICreatePlayerUseCase>(
      TYPES.CreatePlayerUseCase
    );

    const player = await createPlayerUseCase.execute(teamId, validatedData, userId);

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Authorization errors
      if (error.message.includes('not admin')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }

      // Validation errors
      if (error.message.includes('already exists') ||
          error.message.includes('Invalid')) {
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
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

    const { teamId } = await params;

    // Get use case from DI container
    const getTeamPlayersUseCase = container.get<IGetTeamPlayersUseCase>(
      TYPES.GetTeamPlayersUseCase
    );

    // Execute use case
    const players = await getTeamPlayersUseCase.execute(teamId);

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
