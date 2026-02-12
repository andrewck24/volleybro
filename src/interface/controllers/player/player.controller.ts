import { container } from '@/infrastructure/di/inversify.config';
import { TYPES } from '@/infrastructure/di/types';
import type { IGetPlayerUseCase } from '@/applications/usecases/player/get-player.usecase.interface';
import type { IGetTeamPlayersUseCase } from '@/applications/usecases/player/get-team-players.usecase.interface';
import type { IGetUserPlayersUseCase } from '@/applications/usecases/player/get-user-players.usecase.interface';
import type { ICreatePlayerUseCase } from '@/applications/usecases/player/create-player.usecase.interface';
import type { IUpdatePlayerInfoUseCase } from '@/applications/usecases/player/update-player-info.usecase.interface';
import type { IRemovePlayerUseCase } from '@/applications/usecases/player/remove-player.usecase.interface';
import type { Player } from '@/entities/player';
import type { CreatePlayerInput } from '@/lib/validations/player';

/**
 * Player Controller - Player 資源 CRUD
 * 透過 DI container 獲取 use cases 並執行業務邏輯
 */

export const getPlayer = async (playerId: string): Promise<Player> => {
  const useCase = container.get<IGetPlayerUseCase>(TYPES.GetPlayerUseCase);
  return await useCase.execute(playerId);
};

export const getTeamPlayers = async (teamId: string): Promise<Player[]> => {
  const useCase = container.get<IGetTeamPlayersUseCase>(
    TYPES.GetTeamPlayersUseCase
  );
  return await useCase.execute(teamId);
};

export const getUserPlayers = async (userId: string): Promise<Player[]> => {
  const useCase = container.get<IGetUserPlayersUseCase>(
    TYPES.GetUserPlayersUseCase
  );
  return await useCase.execute(userId);
};

export const createPlayer = async (
  teamId: string,
  data: CreatePlayerInput,
  userId: string
): Promise<Player> => {
  const useCase = container.get<ICreatePlayerUseCase>(
    TYPES.CreatePlayerUseCase
  );
  return await useCase.execute(teamId, data, userId);
};

export const updatePlayer = async (
  playerId: string,
  data: Partial<CreatePlayerInput>,
  userId: string
): Promise<Player> => {
  const useCase = container.get<IUpdatePlayerInfoUseCase>(
    TYPES.UpdatePlayerInfoUseCase
  );
  return await useCase.execute(playerId, data, userId);
};

export const removePlayer = async (
  playerId: string,
  userId: string
): Promise<{ success: boolean }> => {
  const useCase = container.get<IRemovePlayerUseCase>(
    TYPES.RemovePlayerUseCase
  );
  return await useCase.execute(playerId, userId);
};
