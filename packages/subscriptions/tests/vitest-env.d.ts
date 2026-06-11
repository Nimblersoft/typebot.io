// Mirrors the augmentation in packages/config/src/tests/globalSetup.ts so the
// container URI is typed when read via `inject` in this package's specs.
declare module "vitest" {
  export interface ProvidedContext {
    pgContainerDatabaseUri: string;
  }
}

export {};
