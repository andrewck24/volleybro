export const TYPES = {
  // repositories
  UserRepository: Symbol.for("UserRepository"),
  TeamRepository: Symbol.for("TeamRepository"),
  RecordRepository: Symbol.for("RecordRepository"),
  ProfileRepository: Symbol.for("ProfileRepository"),

  // services
  AuthenticationService: Symbol.for("AuthenticationService"),
  AuthorizationService: Symbol.for("AuthorizationService"),

  // usecases
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
};
