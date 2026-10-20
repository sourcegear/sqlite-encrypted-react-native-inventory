import Config from 'react-native-config';

export function requireActivationKey(): string {
  const variableName = 'SQLITE_ENCRYPTED_ACTIVATION_KEY';
  const value = Config.SQLITE_ENCRYPTED_ACTIVATION_KEY?.trim();

  if (!value || value === 'replace-with-your-see-activation-key') {
    throw new Error(
      `Missing SEE activation key. Set ${variableName} in .env, then rebuild the native application.`,
    );
  }
  if (value.startsWith('see-')) {
    throw new Error(
      `${variableName} must contain the activation key without the "see-" prefix. The prefix is used only with the PRAGMA form.`,
    );
  }
  return value;
}
