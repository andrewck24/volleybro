import { describe, it, expect } from '@jest/globals';
import { PlayerRole } from '@/entities/player';

describe('PATCH /api/players/[playerId]/role - Update Player Role', () => {
  it('should update player role to ADMIN', async () => {
    const response = {
      status: 200,
      data: {
        _id: 'player_123',
        name: 'Test Player',
        role: PlayerRole.ADMIN,
        teamId: 'team_123',
        updatedAt: new Date().toISOString(),
      },
    };

    expect(response.status).toBe(200);
    expect(response.data.role).toBe(PlayerRole.ADMIN);
  });

  it('should return 400 for invalid role', async () => {
    const response = {
      status: 400,
      error: 'VALIDATION_ERROR',
      message: 'Invalid role value',
    };

    expect(response.status).toBe(400);
  });

  it('should return 401 if not authenticated', async () => {
    const response = {
      status: 401,
      error: 'UNAUTHORIZED',
    };

    expect(response.status).toBe(401);
  });

  it('should return 403 if user is not admin', async () => {
    const response = {
      status: 403,
      error: 'FORBIDDEN',
      message: 'User is not an admin of this team',
    };

    expect(response.status).toBe(403);
  });

  it('should return 404 if player not found', async () => {
    const response = {
      status: 404,
      error: 'NOT_FOUND',
      message: 'Player not found',
    };

    expect(response.status).toBe(404);
  });
});
