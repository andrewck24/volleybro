import type { Player } from '@/entities/player';
import type { CreatePlayerInput } from '@/lib/validations/player';

export interface ICreatePlayerUseCase {
  execute(teamId: string, input: CreatePlayerInput, userId: string): Promise<Player>;
}
