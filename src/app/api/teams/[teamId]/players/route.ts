/**
 * POST /api/teams/{teamId}/players - Create Invitation or Pure Player
 * GET /api/teams/{teamId}/players - List all players in team
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/inversify.config';
import { TYPES } from '@/infrastructure/di/types';
import { getSession } from '@/lib/auth-client';
import {
  ICreateInvitationUseCase,
  IGetTeamPlayersUseCase,
} from '@/applications/usecases/player';
import {
  CreatePlayerSchema,
  PlayerSchema,
} from '@/lib/validations/player';
import { ZodError } from 'zod';

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
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

    const userId = session.user.id;
    const teamId = params.teamId;

    // Parse and validate request body
    const body = await req.json();
    const validatedData = CreatePlayerSchema.parse(body);

    // Get use case from DI container
    const createInvitationUseCase = container.get<ICreateInvitationUseCase>(
      TYPES.CreateInvitationUseCase
    );

    // Execute use case
    const playerId = await createInvitationUseCase.execute(
      teamId,
      validatedData.email.toLowerCase(),
      validatedData.role,
      userId
    );

    return NextResponse.json(
      { playerId },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
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
  { params }: { params: { teamId: string } }
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

    const teamId = params.teamId;

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
