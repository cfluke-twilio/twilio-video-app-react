/// <reference path="./options.d.ts" />
/// <reference path="./token-manager.d.ts" />
/// <reference path="./token-api.d.ts" />
/// <reference path="./session.d.ts" />

declare namespace OktaAuth {
  type OktaAuthBuilder = (args: any) => OktaAuthFactory;
  type OktaAuthFactory = (storageUtil: any, httpRequestClient: any) => any;
}

declare class OktaAuth {
  constructor(options?: OktaAuth.OktaAuthOptions);

  // Core interface, implemented by browser & server
  userAgent: string;
  options: OktaAuth.OktaAuthOptions;
  session: OktaAuth.SessionAPI;
  signIn(options?: OktaAuth.SigninOptions): Promise<any>;

  // Shared methods, added by builderUtil.addSharedPrototypes
  verifyRecoveryToken(options?: object): Promise<any>;
  unlockAccount(options?: object): Promise<any>;
  forgotPassword(options?: object): Promise<any>;
  getIssuerOrigin(): string;

  _onTokenManagerError(error: any): void;
  signOut(options?: OktaAuth.SignoutOptions): Promise<void>;
  webfinger(params?: object): Promise<object>;
  closeSession(): Promise<any>;
  revokeAccessToken(token?: OktaAuth.AccessToken): Promise<any>;
}
