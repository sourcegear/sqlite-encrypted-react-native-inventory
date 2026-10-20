import SQLite, {
  type SQLiteDatabase,
  type SQLiteOpenOptions,
  type SQLiteResultSet,
} from '@sqlite-encrypted/react-native';

import {requireActivationKey} from './config';
import {getOrCreateDatabaseKey} from './databaseKey';
import {
  type InventoryItem,
  type NewInventoryItem,
  validateInventoryItem,
} from './inventory';

const DATABASE_NAME = 'offline-inventory.db';
const ACTIVATION_PROBE_NAME = 'sqlite-encrypted-activation-probe.db';
const ACTIVATION_PROBE_KEY = 'sqlite-encrypted-activation-probe';

SQLite.enablePromise(false);

let databasePromise: Promise<SQLiteDatabase> | undefined;

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}

function activateSEE(activationKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    SQLite.activateSEE(activationKey, resolve, reject);
  });
}

function openDatabase(options: SQLiteOpenOptions): Promise<SQLiteDatabase> {
  return new Promise((resolve, reject) => {
    let database: SQLiteDatabase;
    database = SQLite.openDatabase(
      options,
      openedDatabase => resolve(openedDatabase ?? database),
      reject,
    );
  });
}

function closeDatabase(database: SQLiteDatabase): Promise<void> {
  return new Promise((resolve, reject) => database.close(resolve, reject));
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    SQLite.deleteDatabase({name, location: 'default'}, resolve, reject);
  });
}

function execute(
  database: SQLiteDatabase,
  statement: string,
  parameters: unknown[] = [],
): Promise<SQLiteResultSet> {
  return new Promise((resolve, reject) => {
    database.executeSql(statement, parameters, resolve, reject);
  });
}

async function verifySEEActivation(): Promise<void> {
  await deleteDatabase(ACTIVATION_PROBE_NAME).catch(() => undefined);
  let probe: SQLiteDatabase | undefined;
  try {
    probe = await openDatabase({
      name: ACTIVATION_PROBE_NAME,
      location: 'default',
      key: ACTIVATION_PROBE_KEY,
    });
    await execute(probe, 'SELECT count(*) FROM sqlite_master');
  } catch (cause) {
    throw new Error(
      'SEE activation failed. Verify that SQLITE_ENCRYPTED_ACTIVATION_KEY is valid, unexpired, and covers this platform and SQLite version. Rebuild the native application after changing .env. ' +
        `Details: ${errorMessage(cause)}`,
    );
  } finally {
    if (probe) {
      await closeDatabase(probe).catch(() => undefined);
    }
    await deleteDatabase(ACTIVATION_PROBE_NAME).catch(() => undefined);
  }
}

async function openInventory(): Promise<SQLiteDatabase> {
  await activateSEE(requireActivationKey());
  await verifySEEActivation();

  const key = await getOrCreateDatabaseKey();
  const database = await openDatabase({
    name: DATABASE_NAME,
    location: 'default',
    key,
  });

  try {
    await execute(database, 'SELECT count(*) FROM sqlite_master');
    await execute(
      database,
      `
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity >= 0),
        location TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `,
    );
    await execute(
      database,
      'CREATE INDEX IF NOT EXISTS inventory_name ON inventory_items(name)',
    );
    return database;
  } catch (error) {
    await closeDatabase(database).catch(() => undefined);
    throw error;
  }
}

export function initializeInventory(): Promise<SQLiteDatabase> {
  databasePromise ??= openInventory().catch(error => {
    databasePromise = undefined;
    throw error;
  });
  return databasePromise;
}

function rowsToItems(result: SQLiteResultSet): InventoryItem[] {
  const items: InventoryItem[] = [];
  for (let index = 0; index < result.rows.length; index += 1) {
    const row = result.rows.item(index);
    items.push({
      id: Number(row.id),
      sku: String(row.sku),
      name: String(row.name),
      quantity: Number(row.quantity),
      location: String(row.location),
      updatedAt: String(row.updatedAt),
    });
  }
  return items;
}

export async function listInventory(search = ''): Promise<InventoryItem[]> {
  const database = await initializeInventory();
  const term = search.trim();
  const select = `
    SELECT id, sku, name, quantity, location, updated_at AS updatedAt
    FROM inventory_items
  `;
  const result = term
    ? await execute(
        database,
        `${select}
         WHERE sku LIKE ? OR name LIKE ? OR location LIKE ?
         ORDER BY name COLLATE NOCASE, sku`,
        [`%${term}%`, `%${term}%`, `%${term}%`],
      )
    : await execute(database, `${select} ORDER BY name COLLATE NOCASE, sku`);
  return rowsToItems(result);
}

export async function addInventoryItem(item: NewInventoryItem): Promise<void> {
  const clean = validateInventoryItem(item);
  const database = await initializeInventory();
  await execute(
    database,
    `INSERT INTO inventory_items
      (sku, name, quantity, location, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      clean.sku,
      clean.name,
      clean.quantity,
      clean.location,
      new Date().toISOString(),
    ],
  );
}

export async function adjustInventory(
  id: number,
  adjustment: number,
): Promise<void> {
  const database = await initializeInventory();
  await execute(
    database,
    `UPDATE inventory_items
     SET quantity = MAX(0, quantity + ?), updated_at = ?
     WHERE id = ?`,
    [adjustment, new Date().toISOString(), id],
  );
}

export async function deleteInventoryItem(id: number): Promise<void> {
  const database = await initializeInventory();
  await execute(database, 'DELETE FROM inventory_items WHERE id = ?', [id]);
}
