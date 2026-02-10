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
import { addTrackingButtons } from '../utils/comment-tracking';
import '../styles/track-button.css';

export default defineContentScript({
  matches: ['https://girlschannel.net/topics/*'],
  async main() {
    // URLパターンをチェック: /topics/数字4桁以上 のみ許可
    // /topics/keyword/ や /topics/category/ などは除外
    const topicPathMatch = location.pathname.match(/^\/topics\/(\d{4,})\/?$/);
    if (!topicPathMatch) {
      Logger.info('トピックIDページではありません（キーワードまたはカテゴリページ）', { pathname: location.pathname });
      return;
    }

    Logger.info('トピックページを検出しました。トピック情報を抽出します');

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

    // 各コメントに追跡ボタンを追加
    await addTrackingButtons(topicId, topicTitle);
  },
});
