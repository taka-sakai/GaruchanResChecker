/**
 * @file シンプルなログ管理クラス
 * @description 小規模開発向けの軽量ログシステム
 * 
 * セキュリティ強化:
 * - 本番環境では詳細なスタックトレースを出力しない
 * - センシティブな情報のログ出力を制御
 */
export class Logger {
  static prefix: string = `[${browser.runtime.getManifest().name}]`;

  /**
   * 本番環境かどうか
   */
  static isProduction(): boolean {
    return import.meta.env.MODE === 'production';
  }

  /**
   * オブジェクトから機密情報をフィルタリングする
   * @param data - ログ出力するデータ
   * @returns フィルタリングされたデータ
   */
  private static filterSensitiveData(data: unknown): unknown {
    if (!this.isProduction()) {
      return data;
    }

    // 本番環境ではスタックトレース等の詳細情報を除外
    if (typeof data === 'object' && data !== null) {
      const filtered = { ...data } as Record<string, unknown>;
      delete filtered.stack;
      delete filtered.errStack;
      return filtered;
    }

    return data;
  }

  // 開発環境でのみ実行（console を直接バインドして呼び出し元情報を保持）
  static debug(...args: unknown[]): void {
    if (Logger.isProduction()) return;
    const filtered = args.map((arg) => Logger.filterSensitiveData(arg));
    (console.log as any).bind(console, Logger.prefix)(...filtered);
  }

  static info(...args: unknown[]): void {
    if (Logger.isProduction()) return;
    const filtered = args.map((arg) => Logger.filterSensitiveData(arg));
    (console.info as any).bind(console, Logger.prefix)(...filtered);
  }

  static warn(...args: unknown[]): void {
    if (Logger.isProduction()) return;
    const filtered = args.map((arg) => Logger.filterSensitiveData(arg));
    (console.warn as any).bind(console, Logger.prefix)(...filtered);
  }

  /**
   * 常に実行（本番環境でも出力）
   * ただし、本番環境ではセンシティブ情報をフィルタリング
   */
  static error(...args: unknown[]): void {
    const filtered = args.map((arg) => Logger.filterSensitiveData(arg));
    (console.error as any).bind(console, Logger.prefix)(...filtered);
  }
}

export default Logger;

