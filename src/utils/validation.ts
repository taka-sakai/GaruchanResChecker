/**
 * @file 入力検証ユーティリティ
 * @description セキュリティのための入力検証機能を提供
 */
import { VALIDATION_CONFIG, VALIDATION_PATTERNS, SITE_CONFIG } from '../constants/app-config';

/**
 * 文字列が数値のみで構成されているかを検証する
 * @param value - 検証する文字列
 * @returns 数値のみの場合はtrue
 */
export function isNumericString(value: string): boolean {
  return /^\d+$/.test(value);
}

/**
 * トピックIDの形式を検証する
 * @description トピックIDは数値のみで構成される必要がある
 * @param topicId - 検証するトピックID
 * @returns 有効な場合はtrue
 * @example
 * ```typescript
 * validateTopicId('12345'); // => true
 * validateTopicId('abc123'); // => false
 * validateTopicId(''); // => false
 * ```
 */
export function validateTopicId(topicId: string): boolean {
  if (!topicId || typeof topicId !== 'string') {
    return false;
  }
  
  return VALIDATION_PATTERNS.ID.test(topicId);
}

/**
 * URLが追跡可能なページかどうかを判定する
 * @description コメント追跡機能（追跡ボタン、コンテキストメニュー）を表示するページかどうかを判定
 * @param url - 検証するURL（完全なURLまたはパス名）
 * @returns 追跡可能なページの場合はtrue
 * @example
 * ```typescript
 * isTrackablePageUrl('https://girlschannel.net/comment/123'); // => true
 * isTrackablePageUrl('https://girlschannel.net/topics/1234/'); // => true
 * isTrackablePageUrl('https://girlschannel.net/topics/category/'); // => false
 * ```
 */
export function isTrackablePageUrl(url: string | undefined): boolean {
  if (!url) return false;
  
  try {
    // URLオブジェクトを作成して正規化
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // /comment/* ページ
    if (pathname.startsWith('/comment/')) {
      return true;
    }
    
    // /topics/{4桁以上の数字}/ ページ
    if (VALIDATION_PATTERNS.TOPIC_URL.test(pathname)) {
      return true;
    }
    
    return false;
  } catch {
    // URLのパースに失敗した場合はパス名として扱う
    if (url.startsWith('/comment/')) {
      return true;
    }
    if (VALIDATION_PATTERNS.TOPIC_URL.test(url)) {
      return true;
    }
    return false;
  }
}

/**
 * コメント番号の形式を検証する
 * @description コメント番号は数値のみで構成される必要がある
 * @param commentNumber - 検証するコメント番号
 * @returns 有効な場合はtrue
 * @example
 * ```typescript
 * validateCommentNumber('123'); // => true
 * validateCommentNumber('abc'); // => false
 * ```
 */
export function validateCommentNumber(commentNumber: string): boolean {
  if (!commentNumber || typeof commentNumber !== 'string') {
    return false;
  }
  
  return VALIDATION_PATTERNS.ID.test(commentNumber);
}

/**
 * URLが許可されたドメインであるかを検証する
 * @param url - 検証するURL文字列
 * @param allowedDomain - 許可するドメイン（デフォルト: girlschannel.net）
 * @returns 許可されたドメインの場合はtrue
 * @example
 * ```typescript
 * validateUrl('https://girlschannel.net/topics/123'); // => true
 * validateUrl('https://evil.com/topics/123'); // => false
 * ```
 */
export function validateUrl(url: string, allowedDomain: string = SITE_CONFIG.DOMAIN): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === allowedDomain;
  } catch {
    return false;
  }
}

/**
 * 安全なURL文字列を構築する
 * @description パスパラメータをエスケープしてXSS攻撃を防ぐ
 * @param baseUrl - ベースURL
 * @param path - パス文字列
 * @returns エスケープされた完全なURL
 */
export function buildSafeUrl(baseUrl: string, path: string): string {
  // URLオブジェクトを使用して安全にURLを構築
  const url = new URL(path, baseUrl);
  return url.toString();
}

/**
 * ストレージキーの形式を検証する
 * @param key - 検証するキー
 * @returns 有効な形式の場合はtrue
 */
export function validateStorageKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  return VALIDATION_PATTERNS.STORAGE_KEY.test(key);
}

/**
 * コメント本文の長さを検証する
 * @param text - 検証するテキスト
 * @param maxLength - 最大文字数（デフォルト: 10000）
 * @returns 長さが妥当な場合はtrue
 */
export function validateTextLength(text: string, maxLength: number = VALIDATION_CONFIG.DEFAULT_MAX_TEXT_LENGTH): boolean {
  return typeof text === 'string' && text.length <= maxLength;
}

/**
 * ISO 8601形式の日時文字列を検証する
 * @param dateString - 検証する日時文字列
 * @returns 有効なISO 8601形式の場合はtrue
 */
export function validateISODate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  
  const date = new Date(dateString);
  return date.toString() !== 'Invalid Date' && date.toISOString() === dateString;
}

/**
 * 数値が指定された範囲内にあるかを検証する
 * @param value - 検証する数値
 * @param min - 最小値（デフォルト: 0）
 * @param max - 最大値（デフォルト: Number.MAX_SAFE_INTEGER）
 * @returns 範囲内の場合はtrue
 */
export function validateNumberRange(
  value: number,
  min: number = VALIDATION_CONFIG.DEFAULT_MIN_NUMBER,
  max: number = VALIDATION_CONFIG.DEFAULT_MAX_NUMBER
): boolean {
  return typeof value === 'number' && !Number.isNaN(value) && value >= min && value <= max;
}
