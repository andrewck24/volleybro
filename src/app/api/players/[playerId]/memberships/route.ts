/**
 * POST /api/players/{playerId}/memberships - Invite existing PURE_PLAYER
 * PATCH /api/players/{playerId}/memberships - Update player role
 * DELETE /api/players/{playerId}/memberships - Cancel invitation
 */

import * as membershipController from '@/interface/controllers/player/membership.controller';
import { ManagePlayerMembershipSchema, UpdatePlayerRoleSchema } from '@/lib/validations/player';
import { PlayerSchema } from '@/lib/validations/player';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { PlayerRole } from '@/entities/player';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { playerId } = await params;

    const body = await req.json();
    const validatedData = ManagePlayerMembershipSchema.parse(body);

    const player = await membershipController.createInvitation(
      playerId,
      validatedData.email,
      validatedData.role as PlayerRole,
      userId
    );

    const validatedPlayer = PlayerSchema.parse(player);
    return NextResponse.json(validatedPlayer, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { playerId } = await params;

    const body = await req.json();
    const validatedData = UpdatePlayerRoleSchema.parse(body);

    const player = await membershipController.updateRole(
      playerId,
      validatedData.role as PlayerRole,
      userId
    );

    const validatedPlayer = PlayerSchema.parse(player);
    return NextResponse.json(validatedPlayer, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { playerId } = await params;

    const player = await membershipController.cancelInvitation(playerId, userId);

    const validatedPlayer = PlayerSchema.parse(player);
    return NextResponse.json(validatedPlayer, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Invalid request data', details: error.issues },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    if (error.message.includes('not admin') || error.message.includes('not authorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error.message.includes('already') ||
      error.message.includes('not an invited') ||
      error.message.includes('not invited')
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
