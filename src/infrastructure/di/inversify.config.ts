import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "@/infrastructure/di/types";

import { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { IRecordRepository } from "@/applications/repositories/record.repository.interface";
import { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";

import { UserRepositoryImpl } from "@/infrastructure/db/repositories";
import { TeamRepositoryImpl } from "@/infrastructure/db/repositories";
import { RecordRepositoryImpl } from "@/infrastructure/db/repositories";
import { ProfileRepositoryImpl } from "@/infrastructure/db/repositories";
import { PlayerRepositoryImpl } from "@/infrastructure/db/repositories";
import { AuthenticationService } from "@/infrastructure/services/auth/authentication.service";
import { AuthorizationService } from "@/infrastructure/services/auth/authorization.service";

import {
  GetProfileUseCase,
  CreateProfileUseCase,
  UpdateProfileUseCase,
} from "@/applications/usecases/user/profile.usecase";
import {
  FindRecordUseCase,
  CreateRecordUseCase,
} from "@/applications/usecases/record/record.usecase";
import { FindMatchesUseCase } from "@/applications/usecases/record/matches.usecase";
import {
  CreateSetUseCase,
  UpdateSetUseCase,
} from "@/applications/usecases/record/set.usecase";
import {
  CreateRallyUseCase,
  UpdateRallyUseCase,
} from "@/applications/usecases/record/rally.usecase";
import { CreateSubstitutionUseCase } from "@/applications/usecases/record/substitution.usecase";
import {
  CreateInvitationUseCase,
  GetUserPlayersUseCase,
  AcceptInvitationUseCase,
  RejectInvitationUseCase,
  GetTeamPlayersUseCase,
  GetPlayerUseCase,
  CreatePlayerUseCase,
  UpdateRoleUseCase,
  UpdatePlayerInfoUseCase,
  LeaveTeamUseCase,
  TransferOwnershipUseCase,
  RemovePlayerUseCase,
  CancelInvitationUseCase,
} from "@/applications/usecases/player";

const container = new Container();

// register repositories
container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepositoryImpl);
container.bind<ITeamRepository>(TYPES.TeamRepository).to(TeamRepositoryImpl);
container
  .bind<IRecordRepository>(TYPES.RecordRepository)
  .to(RecordRepositoryImpl);
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

// record usecases
container
  .bind<FindRecordUseCase>(TYPES.FindRecordUseCase)
  .to(FindRecordUseCase);
container
  .bind<CreateRecordUseCase>(TYPES.CreateRecordUseCase)
  .to(CreateRecordUseCase);
container
  .bind<FindMatchesUseCase>(TYPES.FindMatchesUseCase)
  .to(FindMatchesUseCase);
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
container
  .bind<GetPlayerUseCase>(TYPES.GetPlayerUseCase)
  .to(GetPlayerUseCase);
container
  .bind<CreatePlayerUseCase>(TYPES.CreatePlayerUseCase)
  .to(CreatePlayerUseCase);
container
  .bind<UpdateRoleUseCase>(TYPES.UpdateRoleUseCase)
  .to(UpdateRoleUseCase);
container
  .bind<UpdatePlayerInfoUseCase>(TYPES.UpdatePlayerInfoUseCase)
  .to(UpdatePlayerInfoUseCase);
container
  .bind<LeaveTeamUseCase>(TYPES.LeaveTeamUseCase)
  .to(LeaveTeamUseCase);
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
