export interface ILeaveTeamUseCase {
  /**
   * Player leaves a team (unlinks userId but keeps Player record)
   * @param playerId Player to remove from team
   * @param userId User ID of the person leaving
   * @returns Success confirmation
   */
  execute(playerId: string, userId: string): Promise<{ success: boolean }>;
}
