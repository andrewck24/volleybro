export const TYPES = {
  // repositories
  UserRepository: Symbol.for("UserRepository"),
  TeamRepository: Symbol.for("TeamRepository"),
  GameRepository: Symbol.for("GameRepository"),
  ProfileRepository: Symbol.for("ProfileRepository"),
  PlayerRepository: Symbol.for("PlayerRepository"),

  // services
  AuthenticationService: Symbol.for("AuthenticationService"),
  AuthorizationService: Symbol.for("AuthorizationService"),

  // usecases
  // team usecases
  CreateTeamUseCase: Symbol.for("CreateTeamUseCase"),
  GetTeamUseCase: Symbol.for("GetTeamUseCase"),
  UpdateTeamUseCase: Symbol.for("UpdateTeamUseCase"),
  UpdateTeamLineupsUseCase: Symbol.for("UpdateTeamLineupsUseCase"),

  // user auth usecases
  GetProfileUseCase: Symbol.for("GetProfileUseCase"),
  CreateProfileUseCase: Symbol.for("CreateProfileUseCase"),
  UpdateProfileUseCase: Symbol.for("UpdateProfileUseCase"),
  LinkPendingInvitationsUseCase: Symbol.for("LinkPendingInvitationsUseCase"),
  SearchUserUseCase: Symbol.for("SearchUserUseCase"),
  GetUserByIdUseCase: Symbol.for("GetUserByIdUseCase"),

  // game usecases
  FindGameUseCase: Symbol.for("FindGameUseCase"),
  CreateGameUseCase: Symbol.for("CreateGameUseCase"),
  FindGameSummariesUseCase: Symbol.for("FindGameSummariesUseCase"),
  CreateSetUseCase: Symbol.for("CreateSetUseCase"),
  UpdateSetUseCase: Symbol.for("UpdateSetUseCase"),
  RecordRalliesUseCase: Symbol.for("RecordRalliesUseCase"),
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
