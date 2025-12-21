/**
 * PATCH /api/players/{playerId}/role - Update Player Role
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/inversify.config';
import { TYPES } from '@/infrastructure/di/types';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { IUpdateRoleUseCase } from '@/applications/usecases/player';
import { PlayerRole } from '@/entities/player';
import { PlayerSchema } from '@/lib/validations/player';
import { z, ZodError } from 'zod';

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
    const roleSchema = z.object({
      role: z.string().refine(
        (role) => ['MEMBER', 'ADMIN'].includes(role),
        'Role must be MEMBER or ADMIN'
      ),
    });
    const validatedData = roleSchema.parse(body);

    // Get use case from DI container
    const updateRoleUseCase = container.get<IUpdateRoleUseCase>(
      TYPES.UpdateRoleUseCase
    );

    // Execute use case
    const updatedPlayer = await updateRoleUseCase.execute(
      playerId,
      validatedData.role as PlayerRole,
      userId
    );

    // Validate response
    const validatedPlayer = PlayerSchema.parse(updatedPlayer);

    return NextResponse.json(validatedPlayer, { status: 200 });
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

      // Not found errors
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
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
