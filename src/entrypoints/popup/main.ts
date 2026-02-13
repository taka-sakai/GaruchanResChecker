/**
 * @file ポップアップUIのメインスクリプト
 * @description ブラウザアクションボタンをクリックしたときに表示されるUI。
 * 追跡中のコメント一覧を表示し、追跡ボタンや通知の設定を提供する。
 * 
 * 主要機能:
 * - 追跡ボタン表示/非表示切り替え
 * - 通知ON/OFF切り替え
 * - コメント一覧表示（トピック別にグループ化）
 * - 個別コメント削除、トピック単位での一括削除
 * - 未読クリア（リンククリック時）
 */
import './style.css';
import Logger from '../../utils/logger';
import { calculatePageNumber } from '../../utils/pagination';
import { sendMessageSafely } from '../../utils/error-handler';
import { COMMENT_ENTRY_CONFIG, SITE_CONFIG } from '../../constants/app-config';
import type { CommentEntry } from '../../types/comment';
import type {
  GetTrackButtonVisibleResponse,
  SetTrackButtonVisibleResponse,
  GetCrawlerEnabledResponse,
  SetCrawlerEnabledResponse,
  GetAllCommentsResponse,
  RemoveTopicResponse,
  ClearUnreadResponse,
  RemoveCommentResponse,
} from '../../types/messages';

/**
 * アプリケーションのルート要素
 */
const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div>
    <div class="popup-header">
      <span class="app-title">ガルちゃん返信チェッカー</span>
    </div>
    <div class="card">
      <div id="comments-list"></div>
    </div>
  </div>
`;

/**
 * ヘッダー要素
 */
const headerEl = document.querySelector('.popup-header')!;

/**
 * 追跡ボタン表示 ON/OFF スイッチを初期化する
 */
(async () => {
  try {
    // background から追跡ボタン表示状態を取得
    const response = await sendMessageSafely<GetTrackButtonVisibleResponse>({
      type: 'get-track-button-visible',
    });
    const visible = response?.visible ?? true;
    
    const container = document.createElement('div');
    container.className = 'track-button-toggle-container';

    const label = document.createElement('span');
    label.className = 'track-button-label';
    label.textContent = '追跡ボタン';
    container.appendChild(label);

    // スライドスイッチ構造
    const switchLabel = document.createElement('label');
    switchLabel.className = 'switch';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'track-button-toggle';
    toggle.checked = visible;
    const slider = document.createElement('span');
    slider.className = 'slider';
    switchLabel.appendChild(toggle);
    switchLabel.appendChild(slider);
    container.appendChild(switchLabel);

    const status = document.createElement('span');
    status.className = 'track-button-status';
    status.textContent = visible ? '表示' : '非表示';
    container.appendChild(status);

    toggle.addEventListener('change', async () => {
      try {
        await sendMessageSafely<SetTrackButtonVisibleResponse>({
          type: 'set-track-button-visible',
          visible: toggle.checked,
        });
        status.textContent = toggle.checked ? '表示' : '非表示';
      } catch (e) {
        Logger.error('追跡ボタン表示状態の設定に失敗しました', e);
      }
    });

    headerEl.appendChild(container);
  } catch (e) {
    Logger.error('追跡ボタンスイッチの初期化に失敗しました', e);
  }
})();

/**
 * 監視 ON/OFF スイッチを初期化する
 */
(async () => {
  try {
    // background からクローラー有効化状態を取得
    const response = await sendMessageSafely<GetCrawlerEnabledResponse>({
      type: 'get-crawler-enabled',
    });
    const enabled = response?.enabled ?? true;
    
    const container = document.createElement('div');
    container.className = 'crawler-toggle-container';

    const label = document.createElement('span');
    label.className = 'crawler-label';
    label.textContent = '通知';
    container.appendChild(label);

    // スライドスイッチ構造
    const switchLabel = document.createElement('label');
    switchLabel.className = 'switch';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'crawler-toggle';
    toggle.checked = enabled;
    const slider = document.createElement('span');
    slider.className = 'slider';
    switchLabel.appendChild(toggle);
    switchLabel.appendChild(slider);
    container.appendChild(switchLabel);

    const status = document.createElement('span');
    status.className = 'crawler-status';
    status.textContent = enabled ? 'ON' : 'OFF';
    container.appendChild(status);

    toggle.addEventListener('change', async () => {
      try {
        await sendMessageSafely<SetCrawlerEnabledResponse>({
          type: 'set-crawler-enabled',
          enabled: toggle.checked,
        });
        status.textContent = toggle.checked ? 'ON' : 'OFF';
      } catch (e) {
        Logger.error('クローラー有効化状態の設定に失敗しました', e);
      }
    });

    headerEl.appendChild(container);
  } catch (e) {
    Logger.error('クローラースイッチの初期化に失敗しました', e);
  }
})();

/**
 * コメントリストが空の場合の表示を行う
 */
function renderEmpty(): void {
  const list = document.getElementById('comments-list')!;
  list.innerHTML = '<p>コメントはありません。</p>';
}

/**
 * コメントリストを表示する
 * @param comments - コメントエントリーの配列
 */
function renderComments(comments: CommentEntry[]): void {
  const list = document.getElementById('comments-list')!;
  if (!comments || comments.length === 0) return renderEmpty();
  list.innerHTML = '';

  // コメント数が上限に達している場合は通知を表示
  if (comments.length >= COMMENT_ENTRY_CONFIG.MAX_ENTRIES) {
    const notification = document.createElement('div');
    notification.className = 'limit-notification';
    notification.textContent = `コメント数が上限（${COMMENT_ENTRY_CONFIG.MAX_ENTRIES}件）に達しています。古いものから順に削除されます。`;
    list.appendChild(notification);
  }

  // トピックIDでグループ化
  const grouped: Record<string, { topicTitle: string | null; comments: CommentEntry[] }> = comments.reduce((acc, c) => {
    const key = c.topicId;
    if (!acc[key]) {
      acc[key] = { topicTitle: c.topicTitle, comments: [] };
    }
    acc[key].comments.push(c);
    return acc;
  }, {} as Record<string, { topicTitle: string | null; comments: CommentEntry[] }>);

  // 各トピックグループを表示
  Object.values(grouped).forEach((group: { topicTitle: string | null; comments: CommentEntry[] }) => {
    const topicEl = document.createElement('div');
    topicEl.className = 'topic-group';

    // トピックタイトルヘッダー
    const topicTitleEl = document.createElement('div');
    topicTitleEl.className = 'topic-title';
    const topicLink = document.createElement('a');
    const sample = group.comments[0];
    const topicIdForLink = sample?.topicId ?? '';
    const topicBase = `/topics/${topicIdForLink}/`;
    topicLink.href = `${SITE_CONFIG.BASE_URL}${topicBase}`;
    topicLink.target = '_blank';
    topicLink.rel = 'noopener noreferrer';
    topicLink.textContent = group.topicTitle ?? '';
    topicLink.title = group.topicTitle ?? '';
    topicTitleEl.appendChild(topicLink);

    // 全削除ボタン
    const deleteAllBtn = document.createElement('button');
    deleteAllBtn.textContent = '全削除';
    deleteAllBtn.className = 'topic-delete-all-btn';
    deleteAllBtn.addEventListener('click', async () => {
      try {
        await sendMessageSafely<RemoveTopicResponse>({
          type: 'remove-topic',
          topicId: topicIdForLink,
        });
        await loadAndRender();
      } catch (err) {
        Logger.error('トピックの削除に失敗しました', err);
      }
    });
    topicTitleEl.appendChild(deleteAllBtn);

    topicEl.appendChild(topicTitleEl);

    // コメントリスト（コメント番号昇順）
    group.comments.sort((a, b) => parseInt(a.commentNumber) - parseInt(b.commentNumber)).forEach((c) => {
      const el = document.createElement('div');
      el.className = 'comment-item';

      const truncate = (s: any, n: number) => {
        if (s === null || s === undefined) return '';
        const str = String(s);
        return str.length > n ? str.slice(0, n - 1) + '…' : str;
      };

      // 2行目: {postedAt} {commentBody} 返信:{resCount}／未読:{unreadCount}
      const secondLine = document.createElement('div');
      secondLine.className = 'comment-second';

      if (c.postedAt) {
        const posted = document.createElement('span');
        posted.className = 'comment-posted';
        posted.textContent = `${c.postedAt} `;
        secondLine.appendChild(posted);
      }

      const pageNumber = calculatePageNumber(c.commentNumber);
      const commentBase = pageNumber !== '1' ? `/topics/${c.topicId}/${pageNumber}` : `/topics/${c.topicId}/`;
      const commentUrl = `${SITE_CONFIG.BASE_URL}${commentBase}#comment${c.commentNumber}`;
      const commentAnchor = document.createElement('a');
      commentAnchor.href = commentUrl;
      commentAnchor.target = '_blank';
      commentAnchor.rel = 'noopener noreferrer';
      commentAnchor.className = 'comment-link';
      commentAnchor.textContent = `${truncate(c.commentBody ?? '', 80)}`;
      commentAnchor.title = c.commentBody ?? '';
      secondLine.appendChild(commentAnchor);

      const countsLink = document.createElement('a');
      countsLink.className = 'comment-counts';
      const shortCommentUrl = `${SITE_CONFIG.BASE_URL}/comment/${c.topicId}/${c.commentNumber}/`;
      countsLink.href = shortCommentUrl;
      countsLink.target = '_blank';
      countsLink.rel = 'noopener noreferrer';
      countsLink.textContent = ` 返信:${c.resCount ?? 0}／未読:${c.unreadCount ?? 0}`;
      countsLink.title = '返信を読む';
      // クリックされたら未読を0に更新して UI をリフレッシュ
      countsLink.addEventListener('click', async () => {
        try {
          await sendMessageSafely<ClearUnreadResponse>({
            type: 'clear-unread',
            topicId: c.topicId,
            commentNumber: c.commentNumber,
          });
          // background が更新した後に再読み込みして再レンダリング
          await loadAndRender();
        } catch (err) {
          Logger.error('未読カウントのクリアに失敗しました', err);
        }
      });
      secondLine.appendChild(countsLink);

      // 削除ボタン
      const delBtn = document.createElement('button');
      delBtn.textContent = '削除';
      delBtn.className = 'comment-delete-btn';
      delBtn.addEventListener('click', async () => {
        try {
          await sendMessageSafely<RemoveCommentResponse>({
            type: 'remove-comment',
            topicId: c.topicId,
            commentNumber: c.commentNumber,
          });
          await loadAndRender();
        } catch (err) {
          Logger.error('コメントの削除に失敗しました', err);
        }
      });
      secondLine.appendChild(delBtn);

      el.appendChild(secondLine);
      topicEl.appendChild(el);
    });

    list.appendChild(topicEl);
  });
}

/**
 * background からコメントリストを取得して表示する
 */
async function loadAndRender(): Promise<void> {
  try {
    Logger.debug('get-all-comments を送信中...');
    const response = await sendMessageSafely<GetAllCommentsResponse>({
      type: 'get-all-comments',
    });
    Logger.debug('background からの応答:', response);
    const list = response?.comments ?? [];
    Logger.debug('コメント数:', list.length, 'コメント:', list);
    renderComments(list);
  } catch (err) {
    Logger.error('コメントリストの読み込みに失敗しました', err);
    renderEmpty();
  }
}

// background からの更新通知を受信
browser.runtime.onMessage.addListener((msg: { type: string; }) => {
  if (msg?.type === 'refresh-popup') {
    Logger.debug('バッジ更新通知を受信、UI を更新します');
    loadAndRender();
  }
});

// 初期表示
loadAndRender();

