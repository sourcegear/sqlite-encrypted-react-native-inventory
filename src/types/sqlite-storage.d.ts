declare module '@sqlite-encrypted/react-native' {
  export type SQLiteOpenOptions = {
    name: string;
    location?: string;
    key?: string;
  };

  export type SQLiteResultSet = {
    rows: {
      length: number;
      item(index: number): Record<string, unknown>;
    };
    insertId?: number;
    rowsAffected: number;
  };

  export type SQLiteDatabase = {
    close(success: () => void, error: (error: unknown) => void): void;
    executeSql(
      statement: string,
      parameters: unknown[],
      success: (result: SQLiteResultSet) => void,
      error: (error: unknown) => void,
    ): void;
  };

  type SQLiteFactory = {
    enablePromise(enabled: boolean): void;
    activateSEE(
      activationKey: string,
      success: () => void,
      error: (error: unknown) => void,
    ): void;
    openDatabase(
      options: SQLiteOpenOptions,
      success: (database: SQLiteDatabase) => void,
      error: (error: unknown) => void,
    ): SQLiteDatabase;
    deleteDatabase(
      options: SQLiteOpenOptions,
      success: () => void,
      error: (error: unknown) => void,
    ): void;
  };

  const SQLite: SQLiteFactory;
  export default SQLite;
}
