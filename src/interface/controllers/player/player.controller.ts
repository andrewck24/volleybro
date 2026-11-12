import type {
  ICreatePlayerInput,
  ICreatePlayerUseCase,
} from "@/applications/usecases/player/create-player.usecase";
import type {
  IGetPlayerInput,
  IGetPlayerUseCase,
} from "@/applications/usecases/player/get-player.usecase";
import type {
  IGetTeamPlayersInput,
  IGetTeamPlayersUseCase,
} from "@/applications/usecases/player/get-team-players.usecase";
import type {
  IGetUserPlayersInput,
  IGetUserPlayersUseCase,
  PlayerWithTeamName,
} from "@/applications/usecases/player/get-user-players.usecase";
import type {
  IRemovePlayerInput,
  IRemovePlayerUseCase,
} from "@/applications/usecases/player/remove-player.usecase";
import type {
  IUpdatePlayerInfoInput,
  IUpdatePlayerInfoUseCase,
} from "@/applications/usecases/player/update-player-info.usecase";
import { NotFoundError, PlayerReason } from "@/entities/errors";
import type { Player } from "@/entities/player";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const getPlayerController = async (
  input: IGetPlayerInput,
): Promise<Player> => {
  const useCase = container.get<IGetPlayerUseCase>(TYPES.GetPlayerUseCase);
  const player = await useCase.execute(input);
  if (!player) {
    throw new NotFoundError(PlayerReason.PLAYER_NOT_FOUND, "Player not found");
  }
  return player;
};

export const getTeamPlayersController = async (
  input: IGetTeamPlayersInput,
): Promise<Player[]> => {
  const useCase = container.get<IGetTeamPlayersUseCase>(
    TYPES.GetTeamPlayersUseCase,
  );
  return await useCase.execute(input);
};

export const getUserPlayersController = async (
  input: IGetUserPlayersInput,
): Promise<PlayerWithTeamName[]> => {
  const useCase = container.get<IGetUserPlayersUseCase>(
    TYPES.GetUserPlayersUseCase,
  );
  return await useCase.execute(input);
};

export const createPlayerController = async (
  input: ICreatePlayerInput,
): Promise<Player> => {
  const useCase = container.get<ICreatePlayerUseCase>(
    TYPES.CreatePlayerUseCase,
  );
  return await useCase.execute(input);
};

export const updatePlayerController = async (
  input: IUpdatePlayerInfoInput,
): Promise<Player> => {
  const useCase = container.get<IUpdatePlayerInfoUseCase>(
    TYPES.UpdatePlayerInfoUseCase,
  );
  return await useCase.execute(input);
};

export const removePlayerController = async (
  input: IRemovePlayerInput,
): Promise<{ success: boolean }> => {
  const useCase = container.get<IRemovePlayerUseCase>(
    TYPES.RemovePlayerUseCase,
  );
  return await useCase.execute(input);
};
