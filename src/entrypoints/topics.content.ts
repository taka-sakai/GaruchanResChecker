/**
 * @file トピックページ用コンテントスクリプト
 * @description /topics/* ページで実行されるスクリプト。
 * トピック情報を抽出し、各コメントに「追跡」ボタンを追加する。
 * 
 * 処理フロー:
 * 1. ページからトピックIDとタイトルを抽出
 * 2. 各コメントに追跡ボタンをDOMに挿入
 */
import Logger from '../utils/logger';
import { getTopicId, getTopicTitle } from '../utils/topic-extractor';
import { addTrackingButtons, trackCommentFromElement } from '../utils/comment-tracking';
import { isTrackablePageUrl } from '../utils/validation';
import { MESSAGE_TYPES } from '../constants/app-config';
import type { MessageRequest } from '../types/messages';
import '../styles/track-button.css';

export default defineContentScript({
  matches: ['https://girlschannel.net/topics/*'],
  async main() {
    // URLパターンをチェック: /topics/数字4桁以上 のみ許可
    if (!isTrackablePageUrl(location.href)) {
      Logger.info('トピックIDページではありません（キーワードまたはカテゴリページ）', { pathname: location.pathname });
      return;
    }

    Logger.info('トピックページを検出しました。トピック情報を抽出します');

    // コンテキストメニュー用: 右クリックされたコメント要素を記録
    let lastContextMenuTarget: Element | null = null;

    // トピック情報取得
    const topicId = getTopicId('/topics/');
    if (!topicId) {
      Logger.error('このページにトピックIDが見つかりませんでした', { href: location.href });
      return;
    }
    const topicTitle = getTopicTitle();
    if (!topicTitle) {
      Logger.error('このページにトピックタイトルが見つかりませんでした', { href: location.href });
      return;
    }

    // コメント要素を取得（DOM検索は1回のみ）
    const commentElements = document.querySelectorAll('.comment-item');

    // 各コメントに追跡ボタンを追加
    await addTrackingButtons(topicId, topicTitle, commentElements);

    // コンテキストメニュー用: 各コメントに右クリックイベントリスナーを追加
    commentElements.forEach((commentEl) => {
      commentEl.addEventListener('contextmenu', () => {
        // 右クリックされたコメント要素を記録
        lastContextMenuTarget = commentEl;
      });
    });

    // background.tsからのメッセージを受信
    browser.runtime.onMessage.addListener((message: MessageRequest) => {
      if (message.type === MESSAGE_TYPES.TRACK_FROM_CONTEXT_MENU && lastContextMenuTarget) {
        trackCommentFromElement(lastContextMenuTarget, topicId, topicTitle, 'context-menu');
      }
    });
  },
});
