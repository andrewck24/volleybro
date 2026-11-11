import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { ITransactionRunner } from "@/applications/services/transaction/transaction-runner.interface";
import {
  authorizeManagePlayer,
  getManageRefusalDetail,
} from "@/applications/usecases/player/membership";
import {
  AuthorizationError,
  NotFoundError,
  UnexpectedError,
  CommonReason,
  PlayerReason,
} from "@/entities/errors";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IRemovePlayerInput {
  playerId: string;
  userId: string;
}

export interface IRemovePlayerUseCase {
  execute(input: IRemovePlayerInput): Promise<{ success: boolean }>;
}

@injectable()
export class RemovePlayerUseCase implements IRemovePlayerUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
    @inject(TYPES.TransactionRunner)
    private transactionRunner: ITransactionRunner,
  ) {}

  async execute({
    playerId,
    userId,
  }: IRemovePlayerInput): Promise<{ success: boolean }> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player not found",
      );
    }

    if (!player.teamId)
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player has no team",
      );
    const teamId = player.teamId;
    await authorizeManagePlayer(
      this.playerRepository,
      this.teamRepository,
      teamId,
      player,
      userId,
    );

    await this.transactionRunner.run(async () => {
      const canRemove = await this.teamRepository.removeNonOwnerFromLineups(
        teamId,
        playerId,
      );
      if (!canRemove) {
        throw new AuthorizationError(
          PlayerReason.TARGET_IS_OWNER,
          getManageRefusalDetail(PlayerReason.TARGET_IS_OWNER),
        );
      }

      const deleted = await this.playerRepository.delete(playerId);
      if (!deleted) {
        throw new UnexpectedError(
          CommonReason.UNHANDLED_ERROR,
          "Failed to delete player",
        );
      }
    });

    return { success: true };
  }
}
