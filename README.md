# React Native Offline Inventory

A React Native sample that keeps a small inventory completely offline in an
encrypted SQLite database. It uses the published
`@sqlite-encrypted/react-native` package and the official SQLite Encryption
Extension (SEE) on Android and iOS.

The sample demonstrates:

- installing SQLite.Encrypted from `packages.sourcegear.com`;
- validating and activating SEE before opening a keyed database;
- surfacing missing, expired, wrong-platform, and wrong-version activation
  failures clearly;
- generating a random 256-bit database key and protecting it with the Android
  Keystore or iOS Keychain;
- ordinary `react-native-sqlite-storage` queries after the keyed open;
- offline inventory search, item creation, deletion, and stock adjustments; and
- configuring the binding on React Native's legacy bridge architecture.

## Prerequisites

- Node.js 18 or later
- Android Studio and an emulator/device, or Xcode and an iOS simulator/device
- a SQLite.Encrypted activation key.

Free fully-featured demo keys are available from
[sqlite.sourcegear.com](https://sqlite.sourcegear.com/#evaluation).

The activation key must cover the target platform and the SQLite minor version
bundled in the package. Pass the activation hex string without the `see-`
prefix used by the PRAGMA form.

## Configure the activation key

Copy the example environment file:

```shell
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

Replace the placeholder in `.env`:

```dotenv
SQLITE_ENCRYPTED_ACTIVATION_KEY=<your-activation-key>
```

`react-native-config` places this value in the compiled application; `.env` is
not a secret vault and is excluded from Git only to prevent accidental source
commits. Choose an activation-key delivery strategy appropriate for your
production application.

Changing `.env` requires rebuilding the native application, not merely
refreshing JavaScript in Metro.

## Install

The checked-in `.npmrc` sends the `@sqlite-encrypted` scope to the SourceGear
registry.

```shell
npm install
```

For iOS, install the pods after installing npm dependencies:

```shell
cd ios
bundle install
bundle exec pod install
cd ..
```

## Run on Android

Start an emulator or connect a device, then run:

```shell
npm run android
```

In a second terminal, start Metro if the CLI did not start it automatically:

```shell
npm start
```

## Run on iOS

From macOS:

```shell
npm run ios
```

## Package choices

The sample stays on React Native 0.76.7 with `newArchEnabled=false` because the
underlying `react-native-sqlite-storage` wrapper is a legacy bridge module. Do
not also install `react-native-sqlite-storage`; SQLite.Encrypted provides that
API and the native SEE library.

The database key is generated locally with `react-native-get-random-values` and
stored by `react-native-keychain`. If the secure-storage entry is deleted while
the database remains, the existing encrypted database cannot be reopened. A
production application should define backup, recovery, and key-rotation rules.

## Checks

```shell
npm run typecheck
npm test
npm run lint
```
