export const TYPES = {
  // repositories
  UserRepository: Symbol.for("UserRepository"),
  TeamRepository: Symbol.for("TeamRepository"),
  RecordRepository: Symbol.for("RecordRepository"),
  ProfileRepository: Symbol.for("ProfileRepository"),
  PlayerRepository: Symbol.for("PlayerRepository"),

  // services
  AuthenticationService: Symbol.for("AuthenticationService"),
  AuthorizationService: Symbol.for("AuthorizationService"),

  // usecases
  // team usecases
  CreateTeamUseCase: Symbol.for("CreateTeamUseCase"),

  // user auth usecases
  GetProfileUseCase: Symbol.for("GetProfileUseCase"),
  CreateProfileUseCase: Symbol.for("CreateProfileUseCase"),
  UpdateProfileUseCase: Symbol.for("UpdateProfileUseCase"),

  // record usecases
  FindRecordUseCase: Symbol.for("FindRecordUseCase"),
  CreateRecordUseCase: Symbol.for("CreateRecordUseCase"),
  FindMatchesUseCase: Symbol.for("FindMatchesUseCase"),
  CreateSetUseCase: Symbol.for("CreateSetUseCase"),
  UpdateSetUseCase: Symbol.for("UpdateSetUseCase"),
  CreateRallyUseCase: Symbol.for("CreateRallyUseCase"),
  UpdateRallyUseCase: Symbol.for("UpdateRallyUseCase"),
  CreateSubstitutionUseCase: Symbol.for("CreateSubstitutionUseCase"),

  // player usecases
  CreateInvitationUseCase: Symbol.for("CreateInvitationUseCase"),
  GetUserPlayersUseCase: Symbol.for("GetUserPlayersUseCase"),
  AcceptInvitationUseCase: Symbol.for("AcceptInvitationUseCase"),
  RejectInvitationUseCase: Symbol.for("RejectInvitationUseCase"),
  GetTeamPlayersUseCase: Symbol.for("GetTeamPlayersUseCase"),
  GetPlayerUseCase: Symbol.for("GetPlayerUseCase"),
  CreatePlayerUseCase: Symbol.for("CreatePlayerUseCase"),
  UpdateRoleUseCase: Symbol.for("UpdateRoleUseCase"),
  UpdatePlayerInfoUseCase: Symbol.for("UpdatePlayerInfoUseCase"),
  LeaveTeamUseCase: Symbol.for("LeaveTeamUseCase"),
  TransferOwnershipUseCase: Symbol.for("TransferOwnershipUseCase"),
  RemovePlayerUseCase: Symbol.for("RemovePlayerUseCase"),
  CancelInvitationUseCase: Symbol.for("CancelInvitationUseCase"),
};
