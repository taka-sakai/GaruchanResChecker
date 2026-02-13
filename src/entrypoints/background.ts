/**
 * @file バックグラウンドサービスワーカー
 * @description ブラウザ拡張機能のメインロジックを実行するバックグラウンドスクリプト。
 * 
 * 主要機能:
 * - コメントエントリーのCRUD操作とストレージ管理
 * - 定期的なクローリングによる返信数の更新
 * - 未読バッジの管理と表示
 * - content script/popup間のメッセージング
 * - タブアクティベーションに応じたアイコン切り替え
 * 
 * メッセージハンドラー:
 * - upsert-comment: コメントの追加/更新
 * - remove-comment: コメントの削除
 * - remove-topic: トピック単位での削除
 * - clear-unread: 未読数のクリア
 * - get-all-comments: 全コメント取得
 * - set/get-crawler-enabled: クローラー有効化状態の管理
 * - set/get-track-button-visible: 追跡ボタン表示管理
 * - set/get-session: セッションストレージ管理
 * - crawl-now: 即時クローリング実行
 */
import Logger from '../utils/logger';
import { storage } from '#imports';
import { updateIconForTab } from '../utils/icon-manager';
import type { MessageRequest, MessageResponse } from '../types/messages';
import type { Tab, ActiveInfo, ChangeInfo } from '../types/browser.d';
import {
  loadCacheFromStorage,
  getAllCommentsFromCache,
  getCommentFromCache,
  saveComment,
} from '../services/comment-service';
import {
  crawlCommentsOnce,
  waitUntilCrawlerEnabled,
} from '../services/crawler-service';
import { sleep } from '../services/storage-service';
import { routeMessage } from '../services/message-handler';
import {
  STORAGE_KEYS,
  BADGE_CONFIG,
  CRAWLER_CONFIG,
  MESSAGE_TYPES,
  CONTEXT_MENU_CONFIG,
} from '../constants/app-config';
import { isTrackablePageUrl } from '../utils/validation';
/**
 * 未読合計を取得する
 * @returns 未読合計
 */
async function getUnreadTotal(): Promise<number> {
  return (await storage.getItem<number>(STORAGE_KEYS.UNREAD_TOTAL)) ?? 0;
}

/**
 * 未読合計を設定してバッジを更新する
 * @param value - 未読合計
 */
async function setUnreadTotal(value: number): Promise<void> {
  const next = Math.max(0, Math.floor(value));
  await storage.setItem(STORAGE_KEYS.UNREAD_TOTAL, next);

  // バッジを即座に更新
  try {
    const text = next > 0 ? String(next) : '';
    await browser.action.setBadgeText({ text });
    Logger.debug('バッジテキストを設定しました', { text });
    await browser.action.setBadgeBackgroundColor({ color: BADGE_CONFIG.BACKGROUND_COLOR });
    try {
      await browser.action.setBadgeTextColor?.({ color: BADGE_CONFIG.TEXT_COLOR });
    } catch {
      // setBadgeTextColor が未対応のブラウザでは無視
    }
  } catch (e) {
    Logger.error('バッジ更新に失敗しました', e);
  }

  // popup が開いている場合は更新通知を送信
  try {
    await browser.runtime.sendMessage({ type: MESSAGE_TYPES.REFRESH_POPUP });
  } catch {
    // popup が開いていない場合は無視（エラーは正常）
  }
}

/**
 * 未読合計を差分調整する
 * @param delta - 増減値
 */
async function adjustUnread(delta: number): Promise<void> {
  if (!delta) return;
  const cur = await getUnreadTotal();
  await setUnreadTotal(cur + delta);
}

/**
 * バッジを再計算する
 * @description 全コメントのunreadCountを合計し、バッジテキストを更新する
 */
async function recomputeBadge(): Promise<void> {
  try {
    const list = getAllCommentsFromCache();
    const total = list.reduce((acc, it) => acc + (Number(it?.unreadCount) || 0), 0);
    Logger.info('バッジ再計算: 合計を算出しました', { total });
    await setUnreadTotal(total);
  } catch (e) {
    Logger.error('バッジ再計算でエラーが発生しました', e);
  }
}
export default defineBackground(() => {
  Logger.info('バックグラウンドを初期化しました', { id: browser.runtime.id });

  // Content Script から storage.session へのアクセスを許可する
  browser.storage.session.setAccessLevel({
    accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
  });

  // 起動時の初期化処理
  (async () => {
    try {
      // キャッシュをロード
      await loadCacheFromStorage();

      // 現在アクティブなタブのアイコンを初期設定
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        await updateIconForTab(tabs[0].id, tabs[0].url);
      }

      // 初期バッジ設定
      await recomputeBadge();

      // コンテキストメニューを作成（初期状態は非表示）
      browser.contextMenus.create({
        id: CONTEXT_MENU_CONFIG.TRACK_COMMENT_ID,
        title: CONTEXT_MENU_CONFIG.TRACK_COMMENT_TITLE,
        contexts: CONTEXT_MENU_CONFIG.CONTEXTS,
        visible: false,
      });
      Logger.info('コンテキストメニューを作成しました');
      
      // 現在のタブに応じてメニューの表示を更新
      if (tabs && tabs[0]) {
        await updateContextMenuVisibility(tabs[0].url);
      }
    } catch (e) {
      Logger.error('初期化中にエラーが発生しました', e);
    }
  })();

  // アクティブタブが切り替わったとき
  browser.tabs.onActivated.addListener(async (activeInfo: ActiveInfo) => {
    try {
      const tab: Tab = await browser.tabs.get(activeInfo.tabId);
      await updateIconForTab(tab.id, tab.url);
      await updateContextMenuVisibility(tab.url);
    } catch (e) {
      Logger.error('タブアクティブ化時のエラー', e);
    }
  });

  // タブのURLが変化・ページロード完了時
  browser.tabs.onUpdated.addListener(async (tabId: number, changeInfo: ChangeInfo, tab: Tab) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
      await updateIconForTab(tabId, changeInfo.url ?? tab.url);
      await updateContextMenuVisibility(changeInfo.url ?? tab.url);
    }
  });

  // ウィンドウのフォーカスが変わったとき
  browser.windows.onFocusChanged.addListener(async (windowId: any) => {
    if (windowId === browser.windows.WINDOW_ID_NONE) return;
    try {
      const tabs = await browser.tabs.query({ active: true, windowId });
      if (tabs && tabs[0]) {
        await updateIconForTab(tabs[0].id, tabs[0].url);
        await updateContextMenuVisibility(tabs[0].url);
      }
    } catch (e) {
      Logger.error('ウィンドウフォーカス変更時のエラー', e);
    }
  });

  // クローラーループ
  (async () => {
    try {
      Logger.info('クローラーループを開始します');

      // 初回デフォルト: 値が未設定なら有効化しておく
      const saved = await storage.getItem<boolean>(STORAGE_KEYS.CRAWLER_ENABLED);
      if (saved === undefined || saved === null) {
        await storage.setItem(STORAGE_KEYS.CRAWLER_ENABLED, true);
        Logger.info('クローラーを有効化しました（デフォルト設定）');
      }

      const IDLE_DELAY_MS = CRAWLER_CONFIG.IDLE_DELAY_MS;
      const ACTIVE_DELAY_MS = CRAWLER_CONFIG.ACTIVE_DELAY_MS;

      while (true) {
        const enabled = (await storage.getItem<boolean>(STORAGE_KEYS.CRAWLER_ENABLED)) ?? true;
        if (!enabled) {
          Logger.info('クローラー: 停止中。再開を待ちます');
          await waitUntilCrawlerEnabled();
          continue;
        }

        const list = getAllCommentsFromCache();
        const updatedCount = await crawlCommentsOnce(list, getCommentFromCache, saveComment, adjustUnread);

        if (updatedCount === 0) {
          await sleep(IDLE_DELAY_MS);
        } else {
          await sleep(ACTIVE_DELAY_MS);
        }

        // 待機後に停止フラグを確認して反映
        try {
          const enabledAfterWait = (await storage.getItem<boolean>(STORAGE_KEYS.CRAWLER_ENABLED)) ?? true;
          if (!enabledAfterWait) {
            Logger.info('クローラーループ: 待機後に停止フラグが検出されたため次回は停止します');
          }
        } catch (e) {
          Logger.warn('クローラーループ: 待機後の enabled 読み取りに失敗しましたが継続します', e);
        }
      }
    } catch (e) {
      Logger.error('クローラーループでエラーが発生しました', e);
    }
  })();

  // メッセージハンドラ
  browser.runtime.onMessage.addListener(
    (message: MessageRequest, _sender: unknown, sendResponse: (response: MessageResponse) => void) => {
      if (!message) {
        sendResponse({ ok: false, error: 'メッセージが空です' });
        return false;
      }

      // 非同期処理を実行して結果を返す
      (async () => {
        const response = await routeMessage(message, { adjustUnread });
        sendResponse(response);
      })();

      // 非同期レスポンスを待つために true を返す
      return true;
    }
  );

  // コンテキストメニュークリックハンドラ
  browser.contextMenus.onClicked.addListener((info: any, tab: any) => {
    if (info.menuItemId === CONTEXT_MENU_CONFIG.TRACK_COMMENT_ID && tab?.id && tab?.url) {
      // URLをチェック（念のため）
      if (!isTrackablePageUrl(tab.url)) {
        Logger.warn('コンテキストメニュー: 追跡不可能なページです', { url: tab.url });
        return;
      }
      
      Logger.info('コンテキストメニューがクリックされました', { tabId: tab.id, url: tab.url });
      // content scriptに追跡処理を依頼
      browser.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.TRACK_FROM_CONTEXT_MENU,
        tabId: tab.id
      }).catch((err: any) => {
        Logger.error('コンテキストメニュー処理でエラーが発生しました', err);
      });
    }
  });
});

/**
 * コンテキストメニューの表示/非表示を更新する
 * @param url - 現在のタブのURL
 */
async function updateContextMenuVisibility(url: string | undefined): Promise<void> {
  try {
    const visible = isTrackablePageUrl(url);
    await browser.contextMenus.update(CONTEXT_MENU_CONFIG.TRACK_COMMENT_ID, { visible });
    Logger.debug('コンテキストメニューの表示を更新しました', { url, visible });
  } catch (e) {
    Logger.error('コンテキストメニューの更新に失敗しました', e);
  }
}
