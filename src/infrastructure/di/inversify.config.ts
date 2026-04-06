import { TYPES } from "@/infrastructure/di/types";
import { Container } from "inversify";
import "reflect-metadata";

import { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";

import {
  GameRepositoryImpl,
  PlayerRepositoryImpl,
  ProfileRepositoryImpl,
  TeamRepositoryImpl,
  UserRepositoryImpl,
} from "@/infrastructure/db/repositories";
import { AuthenticationService } from "@/infrastructure/services/auth/authentication.service";
import { AuthorizationService } from "@/infrastructure/services/auth/authorization.service";

import { FindGameSummariesUseCase } from "@/applications/usecases/game/game-summaries.usecase";
import {
  CreateGameUseCase,
  FindGameUseCase,
} from "@/applications/usecases/game/game.usecase";
import {
  CreateRallyUseCase,
  UpdateRallyUseCase,
} from "@/applications/usecases/game/rally.usecase";
import {
  CreateSetUseCase,
  UpdateSetUseCase,
} from "@/applications/usecases/game/set.usecase";
import { CreateSubstitutionUseCase } from "@/applications/usecases/game/substitution.usecase";
import {
  AcceptInvitationUseCase,
  CancelInvitationUseCase,
  CreateInvitationUseCase,
  CreatePlayerUseCase,
  GetPlayerUseCase,
  GetTeamPlayersUseCase,
  GetUserPlayersUseCase,
  LeaveTeamUseCase,
  RejectInvitationUseCase,
  RemovePlayerUseCase,
  TransferOwnershipUseCase,
  UpdatePlayerInfoUseCase,
  UpdateRoleUseCase,
} from "@/applications/usecases/player";
import { CreateTeamUseCase } from "@/applications/usecases/team/create-team.usecase";
import { GetUserByIdUseCase } from "@/applications/usecases/user/get-user-by-id.usecase";
import { LinkPendingInvitationsUseCase } from "@/applications/usecases/user/link-pending-invitations.usecase";
import {
  CreateProfileUseCase,
  GetProfileUseCase,
  UpdateProfileUseCase,
} from "@/applications/usecases/user/profile.usecase";
import { SearchUserUseCase } from "@/applications/usecases/user/search-user.usecase";

const container = new Container();

// register repositories
container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepositoryImpl);
container.bind<ITeamRepository>(TYPES.TeamRepository).to(TeamRepositoryImpl);
container.bind<IGameRepository>(TYPES.GameRepository).to(GameRepositoryImpl);
container
  .bind<IProfileRepository>(TYPES.ProfileRepository)
  .to(ProfileRepositoryImpl);
container
  .bind<IPlayerRepository>(TYPES.PlayerRepository)
  .to(PlayerRepositoryImpl);

// register services
container
  .bind<IAuthenticationService>(TYPES.AuthenticationService)
  .to(AuthenticationService);
container
  .bind<IAuthorizationService>(TYPES.AuthorizationService)
  .to(AuthorizationService);

// register usecases
// team usecases
container
  .bind<CreateTeamUseCase>(TYPES.CreateTeamUseCase)
  .to(CreateTeamUseCase);

// user auth usecases
container
  .bind<GetProfileUseCase>(TYPES.GetProfileUseCase)
  .to(GetProfileUseCase);
container
  .bind<CreateProfileUseCase>(TYPES.CreateProfileUseCase)
  .to(CreateProfileUseCase);
container
  .bind<UpdateProfileUseCase>(TYPES.UpdateProfileUseCase)
  .to(UpdateProfileUseCase);
container
  .bind<LinkPendingInvitationsUseCase>(TYPES.LinkPendingInvitationsUseCase)
  .to(LinkPendingInvitationsUseCase);
container
  .bind<SearchUserUseCase>(TYPES.SearchUserUseCase)
  .to(SearchUserUseCase);
container
  .bind<GetUserByIdUseCase>(TYPES.GetUserByIdUseCase)
  .to(GetUserByIdUseCase);

// game usecases
container.bind<FindGameUseCase>(TYPES.FindGameUseCase).to(FindGameUseCase);
container
  .bind<CreateGameUseCase>(TYPES.CreateGameUseCase)
  .to(CreateGameUseCase);
container
  .bind<FindGameSummariesUseCase>(TYPES.FindGameSummariesUseCase)
  .to(FindGameSummariesUseCase);
container.bind<CreateSetUseCase>(TYPES.CreateSetUseCase).to(CreateSetUseCase);
container.bind<UpdateSetUseCase>(TYPES.UpdateSetUseCase).to(UpdateSetUseCase);
container
  .bind<CreateRallyUseCase>(TYPES.CreateRallyUseCase)
  .to(CreateRallyUseCase);
container
  .bind<UpdateRallyUseCase>(TYPES.UpdateRallyUseCase)
  .to(UpdateRallyUseCase);
container
  .bind<CreateSubstitutionUseCase>(TYPES.CreateSubstitutionUseCase)
  .to(CreateSubstitutionUseCase);

// player usecases
container
  .bind<CreateInvitationUseCase>(TYPES.CreateInvitationUseCase)
  .to(CreateInvitationUseCase);
container
  .bind<GetUserPlayersUseCase>(TYPES.GetUserPlayersUseCase)
  .to(GetUserPlayersUseCase);
container
  .bind<AcceptInvitationUseCase>(TYPES.AcceptInvitationUseCase)
  .to(AcceptInvitationUseCase);
container
  .bind<RejectInvitationUseCase>(TYPES.RejectInvitationUseCase)
  .to(RejectInvitationUseCase);
container
  .bind<GetTeamPlayersUseCase>(TYPES.GetTeamPlayersUseCase)
  .to(GetTeamPlayersUseCase);
container.bind<GetPlayerUseCase>(TYPES.GetPlayerUseCase).to(GetPlayerUseCase);
container
  .bind<CreatePlayerUseCase>(TYPES.CreatePlayerUseCase)
  .to(CreatePlayerUseCase);
container
  .bind<UpdateRoleUseCase>(TYPES.UpdateRoleUseCase)
  .to(UpdateRoleUseCase);
container
  .bind<UpdatePlayerInfoUseCase>(TYPES.UpdatePlayerInfoUseCase)
  .to(UpdatePlayerInfoUseCase);
container.bind<LeaveTeamUseCase>(TYPES.LeaveTeamUseCase).to(LeaveTeamUseCase);
container
  .bind<TransferOwnershipUseCase>(TYPES.TransferOwnershipUseCase)
  .to(TransferOwnershipUseCase);
container
  .bind<RemovePlayerUseCase>(TYPES.RemovePlayerUseCase)
  .to(RemovePlayerUseCase);
container
  .bind<CancelInvitationUseCase>(TYPES.CancelInvitationUseCase)
  .to(CancelInvitationUseCase);

export { container };
