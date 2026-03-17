/**
 * PATCH /api/players/{playerId}/invitations - Accept, reject, or leave
 */

import * as invitationController from '@/interface/controllers/player/invitation.controller';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

const PatchInvitationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('reject') }),
  z.object({ action: z.literal('leave') }),
]);

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
    const { action } = PatchInvitationSchema.parse(body);

    switch (action) {
      case 'accept': {
        await invitationController.acceptInvitation(playerId, userId);
        return NextResponse.json(
          { success: true, message: 'Invitation accepted' },
          { status: 200 }
        );
      }

      case 'reject': {
        await invitationController.rejectInvitation(playerId, userId);
        return NextResponse.json(
          { success: true, message: 'Invitation rejected' },
          { status: 200 }
        );
      }

      case 'leave': {
        await invitationController.leaveTeam(playerId, userId);
        return NextResponse.json(
          { success: true, message: 'Left team successfully' },
          { status: 200 }
        );
      }
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      if (
        error.message.includes('already') ||
        error.message.includes('No invitation') ||
        error.message.includes('not invited') ||
        error.message.includes('Owner cannot')
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
}
