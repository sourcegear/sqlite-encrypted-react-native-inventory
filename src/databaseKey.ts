import * as Keychain from 'react-native-keychain';

const DATABASE_KEY_SERVICE = 'sqlite-encrypted-inventory.database-key';

export function generateDatabaseKey(): string {
  const bytes = new Uint8Array(32);
  global.crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join(
    '',
  );
}

export async function getOrCreateDatabaseKey(): Promise<string> {
  const existing = await Keychain.getGenericPassword({
    service: DATABASE_KEY_SERVICE,
  });
  if (existing) {
    return existing.password;
  }

  const generated = generateDatabaseKey();
  await Keychain.setGenericPassword('database-key', generated, {
    service: DATABASE_KEY_SERVICE,
  });
  return generated;
}
