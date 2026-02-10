/**
 * @file エラーハンドリングユーティリティ
 * @description 統一されたエラー処理とリトライ機能を提供
 */
import Logger from './logger';

/**
 * アプリケーション固有のエラークラス
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * リトライオプション
 */
export interface RetryOptions {
  /** 最大リトライ回数 */
  maxRetries?: number;
  /** 初期待機時間（ミリ秒） */
  initialDelayMs?: number;
  /** 指数バックオフを使用するか */
  useExponentialBackoff?: boolean;
  /** エラーログを出力するか */
  logErrors?: boolean;
}

/**
 * 指定時間待機する
 * @param ms - 待機時間（ミリ秒）
 */
async function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * リトライ機能付きで関数を実行する
 * @description 指定した関数を実行し、失敗時に自動的にリトライする。
 * 指数バックオフを使用することで、再試行間隔を徐々に延ばしてサーバー負荷を軽減する。
 * @template T - 関数の戻り値の型
 * @param fn - 実行する非同期関数
 * @param options - リトライオプション
 * @returns 関数の実行結果
 * @throws {Error} 最大リトライ回数を超えた場合は最後のエラーをスロー
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await fetch(url),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 100,
    useExponentialBackoff = true,
    logErrors = true,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (logErrors) {
        Logger.warn(`リトライ ${attempt + 1}/${maxRetries}`, {
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries,
        });
      }

      // 次のリトライまで待機（最後の試行後は待機不要）
      if (attempt < maxRetries - 1) {
        // 指数バックオフ: 100ms, 200ms, 400ms, ...
        const delayMs = useExponentialBackoff
          ? initialDelayMs * Math.pow(2, attempt)
          : initialDelayMs;
        await sleep(delayMs);
      }
    }
  }

  throw lastError || new Error('リトライが最大回数を超えました');
}

/**
 * try-catch を安全にラップする
 * @param fn - 実行する関数
 * @param errorHandler - エラーハンドラ（オプション）
 * @returns 成功時の結果、失敗時は null
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (errorHandler) {
      errorHandler(err);
    } else {
      Logger.error('予期しないエラーが発生しました', err);
    }
    return null;
  }
}

/**
 * browser.runtime.sendMessage のエラーハンドリングラッパー
 * @description メッセージ送信を安全に実行し、エラー時に適切にハンドリングする。
 * レスポンスにok: falseが返った場合もエラーとして扱う。
 * @template T - レスポンスの型
 * @param message - 送信するメッセージ
 * @returns レスポンス、またはエラー時は null
 * @example
 * ```typescript
 * const response = await sendMessageSafely<GetSessionResponse>({
 *   type: 'get-session',
 *   key: topicId,
 * });
 * if (response?.ok) {
 *   console.log(response.value);
 * }
 * ```
 */
export async function sendMessageSafely<T = unknown>(message: unknown): Promise<T | null> {
  return tryCatch(
    async () => {
      const response = await browser.runtime.sendMessage(message);
      if (response && !response.ok && response.error) {
        throw new AppError('MESSAGE_ERROR', response.error, { message });
      }
      return response as T;
    },
    (error) => {
      Logger.error('メッセージ送信に失敗しました', { message, error });
    }
  );
}

/**
 * エラー情報をオブジェクトに変換する
 * @param error - エラーオブジェクト
 * @returns エラー情報オブジェクト
 */
export function errorToObject(error: unknown): Record<string, any> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof AppError ? { code: error.code, context: error.context } : {}),
    };
  }
  return {
    type: typeof error,
    value: String(error),
  };
}
