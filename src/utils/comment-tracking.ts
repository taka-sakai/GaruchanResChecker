/**
 * @file コメント追跡ボタン生成ユーティリティ
 * @description コメントページとトピックページで共通の追跡ボタン生成ロジック
 */
import Logger from './logger';
import { sendMessageSafely } from './error-handler';
import {
  SELECTORS,
  CLASS_NAMES,
  ICONS,
  TEXT_REPLACEMENTS,
  REGEX_PATTERNS,
} from '../constants/app-config';
import { validateTopicId, validateCommentNumber, validateTextLength } from './validation';
import type { GetTrackButtonVisibleResponse, UpsertCommentResponse } from '../types/messages';

/**
 * コメント本文を抽出する（画像・引用を置換）
 * @param element - コメント要素
 * @returns コメント本文
 */
function extractCommentBody(element: Element): string {
  const bodyEl = element.querySelector(SELECTORS.COMMENT_BODY);
  if (!bodyEl) return '';

  // bodyEl のクローンを作成して処理
  const cloned = bodyEl.cloneNode(true) as Element;

  // comment-img要素を【画像】に置換
  cloned.querySelectorAll(SELECTORS.COMMENT_IMG).forEach((imgEl) => {
    imgEl.textContent = TEXT_REPLACEMENTS.IMAGE;
  });

  // comment-url要素を【引用】に置換
  cloned.querySelectorAll(SELECTORS.COMMENT_URL).forEach((urlEl) => {
    urlEl.textContent = TEXT_REPLACEMENTS.QUOTE;
  });

  return cloned.textContent?.trim() || '';
}

/**
 * 返信数を抽出する
 * @param element - コメント要素
 * @returns 返信数
 */
function extractResCount(element: Element): number {
  const resBtn = element.querySelector(SELECTORS.RES_COUNT);
  if (!resBtn) return 0;

  const txt = (resBtn.textContent || '').trim();
  const m = txt.match(REGEX_PATTERNS.RES_COUNT);
  if (m) return parseInt(m[1], 10);

  return 0;
}

/**
 * 投稿日時を抽出する
 * @param element - コメント要素
 * @returns 投稿日時、または null
 */
function extractPostedAt(element: Element): string | null {
  return element.querySelector(SELECTORS.POSTED_AT)?.textContent?.trim() || null;
}

/**
 * 各コメントに追跡ボタンを追加する
 * @param topicId - トピック ID
 * @param topicTitle - トピックタイトル
 */
export async function addTrackingButtons(topicId: string, topicTitle: string): Promise<void> {
  // 追跡ボタン表示状態を取得
  const response = await sendMessageSafely<GetTrackButtonVisibleResponse>({
    type: 'get-track-button-visible',
  });
  const trackButtonVisible = response?.visible ?? true;

  // 追跡ボタンが非表示の場合は何もしない
  if (!trackButtonVisible) {
    Logger.info('追跡ボタンは非表示に設定されています');
    return;
  }

  // 各コメントに「追跡」ボタンを追加
  document.querySelectorAll(SELECTORS.COMMENT_ITEM).forEach((el) => {
    // すでにボタンがあればスキップ
    if (el.querySelector(SELECTORS.TRACK_BUTTON)) return;

    const btn = document.createElement('button');
    btn.className = CLASS_NAMES.TRACK_BUTTON;

    // ハートアイコンを追加
    const icon = document.createElement('img');
    icon.src = (browser.runtime as any).getURL(ICONS.PINK_HEART_SVG);
    icon.className = CLASS_NAMES.TRACK_ICON;
    icon.style.width = '16px';
    icon.style.height = '16px';
    icon.style.marginRight = '6px';
    icon.style.verticalAlign = 'middle';

    const text = document.createElement('span');
    text.textContent = '追跡';

    btn.appendChild(icon);
    btn.appendChild(text);

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        // コメント情報取得
        const commentNumber = el.getAttribute('data-number') || el.id.replace('comment', '');
        const commentBody = extractCommentBody(el);
        const resCount = extractResCount(el);
        const unreadCount = 0;
        const postedAt = extractPostedAt(el);

        // 入力検証（セキュリティ対策）
        if (!validateTopicId(topicId)) {
          Logger.error('無効なトピックIDが検出されました', { topicId });
          return;
        }
        if (!validateCommentNumber(commentNumber)) {
          Logger.error('無効なコメント番号が検出されました', { commentNumber });
          return;
        }
        if (commentBody && !validateTextLength(commentBody)) {
          Logger.error('コメント本文が長すぎます', { length: commentBody.length });
          return;
        }

        const entry = {
          topicId,
          topicTitle,
          commentNumber,
          postedAt,
          commentBody,
          resCount,
          unreadCount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 書き込みは background 経由で集中処理する
        const saveResult = await sendMessageSafely<UpsertCommentResponse>({
          type: 'upsert-comment',
          entry,
        });
        
        if (saveResult?.ok) {
          Logger.info('手動追加: コメントを保存しました', entry);
          // 追加直後に一度クローラーを呼び出して初期値を取得
          await sendMessageSafely({ type: 'crawl-now' });
        }
      } catch (err) {
        Logger.error('手動追加: コメント保存に失敗', err);
      }
    });

    // コメント下部にボタン追加
    const actions = el.querySelector(SELECTORS.ACTIONS) || el;
    actions.appendChild(btn);
  });
}
