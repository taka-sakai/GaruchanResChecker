/**
 * @file コメント投稿ページ用コンテントスクリプト
 * @description /make_comment/* ページで実行されるスクリプト。
 * コメント投稿フローを追跡し、投稿完了時にコメント情報をストレージに保存する。
 * 
 * 処理フロー:
 * 1. 確認ページ: コメント本文を抽出してセッションに保存
 * 2. 完了ページ: コメント番号を取得し、セッションデータと結合してlocalストレージに保存
 */
import Logger from '../utils/logger';
import { sendMessageSafely } from '../utils/error-handler';
import {
  REGEX_PATTERNS,
  URL_PATTERNS,
  SELECTORS,
  PAGE_IDENTIFIERS,
} from '../constants/app-config';
import type { GetSessionResponse, SetSessionResponse, UpsertCommentResponse } from '../types/messages';

/**
 * トピック ID を取得する
 * @returns トピック ID、または null
 */
function getTopicId(): string | null {
  // body の属性から取得する
  const attr = document.body.getAttribute('topicId');
  if (attr) return attr.trim();

  // URLから取得するフォールバック
  const pattern = new RegExp(`${URL_PATTERNS.MAKE_COMMENT}(\\d+)(?:\\/|$)`);
  const m = location.pathname.match(pattern);
  if (m) return m[1];
  return null;
}

/**
 * コメント投稿内容の確認ページからコメント本文を取得する
 * @returns {(string | null)} コメント本文、または null
 */
function getCommentBodyFromConfirmation(): string | null {
  // 確認ページのhiddenのinputから取得する
  const input = (document.querySelector<HTMLInputElement>(SELECTORS.COMMENT_INPUT)?.value ?? '').trim();
  if (input) return input;
  // 確認ページの表示部分から取得するフォールバック
  const body = document.querySelector(SELECTORS.COMMENT_BODY_LV3)?.textContent?.trim();
  if (body) return body;
  return null;
}

/**
 * トピック URL の href をパースする
 * @param href - URL 文字列
 * @returns パース結果、または null
 */
function parseTopicsHref(href: string) {
  // /topics/{topicId}/{pageNumber}#comment{commentNumber}の想定
  const m = href.match(REGEX_PATTERNS.TOPICS_HREF);
  if (m) return { topicId: m[1], pageNumber: m[2], commentNumber: m[3] };
  // コメント番号だけでも取れるようフォールバック
  const m2 = href.match(REGEX_PATTERNS.COMMENT_ANCHOR);
  if (m2) return { commentNumber: m2[1] };
  return null;
}

/**
 * Date を日本時間（JST）で指定フォーマットに変換する
 * 例: "2026/01/19(月) 18:52:17"
 * @param {Date} [date]
 * @returns {string}
 */
function formatJstDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short'
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  // map.weekday は "月" のような単一文字
  return `${map.year}/${map.month}/${map.day}(${map.weekday}) ${map.hour}:${map.minute}:${map.second}`;
}

export default defineContentScript({
  matches: ['https://girlschannel.net/make_comment/*'],
  async main() {
    Logger.info('コメント投稿ページを検出しました。');

    try {
      const topicId = getTopicId();
      if (!topicId) {
        Logger.error('このページにトピックIDが見つかりませんでした。', { href: location.href });
        return;
      }

      const h1 = document.querySelector(SELECTORS.H1)?.textContent ?? '';

      // 確認ページパターン
      if (h1.includes(PAGE_IDENTIFIERS.COMMENT_CONFIRMATION) || !!document.querySelector(SELECTORS.SUBMIT_FORM)) {
        // コメント本文
        const commentBody = getCommentBodyFromConfirmation();
        
        // 既存データを background から取得
        const response = await sendMessageSafely<GetSessionResponse>({
          type: 'get-session',
          key: topicId,
        });
        const existing = response?.value ?? {};
        
        // スプレッド構文でマージ
        const toSave = { ...existing, commentBody };
        await sendMessageSafely<SetSessionResponse>({
          type: 'set-session',
          key: topicId,
          value: toSave,
        });

        Logger.info('コメント投稿内容の確認ページの情報をセッションに保存しました', toSave);
        return;
      }

      // 完了ページパターン
      if (h1.includes(PAGE_IDENTIFIERS.COMMENT_COMPLETION) || !!document.querySelector(SELECTORS.TOPICS_LINK)) {
        const a = document.querySelector<HTMLAnchorElement>(SELECTORS.TOPICS_LINK);
        const href = a?.href;
        if (!href) {
          Logger.error('完了ページ: トピックへのリンクが見つかりませんでした');
          return;
        }

        const info = parseTopicsHref(href);
        const commentNumber = info?.commentNumber;
        if (!commentNumber) {
          Logger.error('完了ページ: コメント番号が取得できませんでした', { href });
          return;
        }

        // セッションデータを取得
        const response = await sendMessageSafely<GetSessionResponse>({
          type: 'get-session',
          key: topicId,
        });
        const session = response?.value as { topicTitle?: string; commentBody?: string } | undefined;
        
        if (!session) {
          Logger.error('セッションにトピック情報がありません', `topicId: ${topicId}, response: ${JSON.stringify(response)}`);
          return;
        }

        const entry = {
          topicId,
          topicTitle: session.topicTitle ?? null,
          commentNumber,
          postedAt: formatJstDate(new Date()),
          commentBody: session.commentBody ?? null,
          resCount: 0,
          unreadCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 書き込みは background 経由で集中処理する
        const result = await sendMessageSafely<UpsertCommentResponse>({
          type: 'upsert-comment',
          entry,
        });
        
        if (result?.ok) {
          Logger.info('完了ページの情報をlocalストレージに保存しました', entry);
        }
        return;
      }

      Logger.info('該当するサブパターンが見つかりませんでした');
    } catch (err) {
      Logger.error('make_comment content script エラー', err);
    }
  },
});
