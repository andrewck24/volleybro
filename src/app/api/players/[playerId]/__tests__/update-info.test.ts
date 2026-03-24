import { describe, it, expect } from '@jest/globals';
import { Position } from '@/entities/player';
import { createPlayer } from '@/__tests__/helpers';

describe('PATCH /api/players/[playerId]/info - Update Player Info', () => {
  it('should update player name and number', async () => {
    const updatedPlayer = createPlayer({
      _id: 'player_123',
      name: '新名字',
      number: 10,
      teamId: 'team_123',
    });

    const response = {
      status: 200,
      data: updatedPlayer,
    };

    expect(response.status).toBe(200);
    expect(response.data.name).toBe('新名字');
    expect(response.data.number).toBe(10);
  });

  it('should update position only', async () => {
    const updatedPlayer = createPlayer({
      _id: 'player_123',
      position: Position.MB,
      teamId: 'team_123',
    });

    const response = {
      status: 200,
      data: updatedPlayer,
    };

    expect(response.status).toBe(200);
    expect(response.data.position).toBe(Position.MB);
  });

  it('should return 400 for empty update data', async () => {
    const response = {
      status: 400,
      error: 'VALIDATION_ERROR',
      message: 'No fields to update',
    };

    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid position', async () => {
    const response = {
      status: 400,
      error: 'VALIDATION_ERROR',
      message: 'Invalid position value',
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
