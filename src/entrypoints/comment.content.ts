/**
 * @file コメントページ用コンテントスクリプト
 * @description /comment/* ページで実行されるスクリプト。
 * トピック情報を抽出してセッションストレージに保存し、
 * 各コメントに「追跡」ボタンを追加する。
 * 
 * 処理フロー:
 * 1. ページからトピックIDとタイトルを抽出
 * 2. セッションストレージに保存（background経由）
 * 3. 各コメントに追跡ボタンをDOMに挿入
 */
import Logger from '../utils/logger';
import { getTopicId, getTopicTitle } from '../utils/topic-extractor';
import { addTrackingButtons } from '../utils/comment-tracking';
import { sendMessageSafely } from '../utils/error-handler';
import type { GetSessionResponse, SetSessionResponse } from '../types/messages';
import '../styles/track-button.css';

export default defineContentScript({
  matches: ['https://girlschannel.net/comment/*'],
  async main() {
    Logger.info('コメントページを検出しました。トピック情報を抽出します。');

    try {
      const topicId = getTopicId('/comment/');
      if (!topicId) {
        Logger.error('このページにトピックIDが見つかりませんでした。', { href: location.href });
        return;
      }

      const topicTitle = getTopicTitle();
      if (!topicTitle) {
        Logger.error('このページにトピックタイトルが見つかりませんでした。', { href: location.href });
        return;
      }

      const topic = {
        topicId,
        topicTitle,
      };

      // セッションに保存（background 経由）
      await sendMessageSafely<SetSessionResponse>({
        type: 'set-session',
        key: topicId,
        value: topic,
      });
      
      // デバッグのために再取得
      const response = await sendMessageSafely<GetSessionResponse>({
        type: 'get-session',
        key: topicId,
      });
      Logger.info('トピック情報を抽出/保存しました', response?.value);

      // 各コメントに追跡ボタンを追加
      await addTrackingButtons(topicId, topicTitle);
    } catch (err) {
      Logger.error('トピック情報の抽出/保存に失敗しました', err);
    }
  },
});
