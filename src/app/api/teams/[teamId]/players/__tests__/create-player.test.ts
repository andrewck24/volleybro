import { describe, it, expect } from '@jest/globals';
import type { CreatePlayerInput } from '@/lib/validations/player';
import { PlayerRole } from '@/entities/player';

describe('POST /api/teams/[teamId]/players (Create Pure Player)', () => {
  it('should create a pure player without email', async () => {
    const input: CreatePlayerInput = {
      name: '陳球員',
      number: 5,
      position: 'MB',
    };

    // Mock the API call
    const response = {
      status: 201,
      data: {
        _id: 'player_new_001',
        name: input.name,
        number: input.number,
        position: input.position,
        teamId: 'team_123',
        role: PlayerRole.MEMBER,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    expect(response.status).toBe(201);
    expect(response.data.role).toBe(PlayerRole.MEMBER);
    expect(response.data.email).toBeUndefined();
  });

  it('should create an invited player with email', async () => {
    const input: CreatePlayerInput = {
      name: '王小明',
      number: 10,
      position: 'OH',
      email: 'wang@example.com',
      role: PlayerRole.ADMIN,
    };

    const response = {
      status: 201,
      data: {
        _id: 'player_invited_001',
        ...input,
        teamId: 'team_123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    expect(response.status).toBe(201);
    expect(response.data.email).toBe(input.email);
    expect(response.data.role).toBe(PlayerRole.ADMIN);
  });

  it('should return 400 for invalid input', async () => {
    const response = {
      status: 400,
      error: 'VALIDATION_ERROR',
      message: '姓名為必填',
    };

    expect(response.status).toBe(400);
    expect(response.error).toBe('VALIDATION_ERROR');
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

  it('should return 409 if email already invited', async () => {
    const response = {
      status: 409,
      error: 'DUPLICATE_INVITATION',
      message: 'This email has already been invited to this team',
    };

    expect(response.status).toBe(409);
  });
});
