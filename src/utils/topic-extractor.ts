/**
 * @file トピック情報抽出ユーティリティ
 * @description ページからトピックIDやタイトルを抽出する共通ロジック
 */
import { SELECTORS } from '../constants/app-config';

/**
 * URL またはページからトピック ID を取得する
 * @param urlPattern - URLパターン（例: '/comment/', '/topics/', '/make_comment/'）
 * @returns トピック ID、または null
 */
export function getTopicId(urlPattern: string): string | null {
  // body の topicId 属性を利用
  const attr = document.body.getAttribute('topicId');
  if (attr) return attr.trim();

  // URL からパースするフォールバック
  const pattern = new RegExp(`${urlPattern}(\\d+)(?:\\/|$)`);
  const m = location.pathname.match(pattern);
  if (m) return m[1];

  return null;
}

/**
 * トピックタイトルを取得する
 * @returns トピックタイトル、または null
 */
export function getTopicTitle(): string | null {
  // <h1> のテキストを利用
  const h1 = document.querySelector(SELECTORS.H1);
  if (h1) {
    const text = h1.textContent?.trim();
    if (text) return text;
  }

  // og:title をフォールバックとして利用
  const ogTitle = document.querySelector(SELECTORS.OG_TITLE)?.getAttribute('content');
  if (ogTitle) return ogTitle.trim();

  return null;
}
