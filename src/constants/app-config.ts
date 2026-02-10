/**
 * @file アプリケーション定数
 * @description マジックナンバーやハードコード文字列を集約
 */

/**
 * クローラー設定
 */
export const CRAWLER_CONFIG = {
  /** アクティブ時の待機時間（ミリ秒） */
  ACTIVE_DELAY_MS: 3000,
  /** アイドル時の待機時間（ミリ秒） */
  IDLE_DELAY_MS: 60_000,
  /** リトライ間の待機時間（ミリ秒） */
  FETCH_RETRY_WAIT_MS: 3000,
  /** スキップする経過日数 */
  SKIP_AFTER_DAYS: 31,
  /** 最大リトライ回数 */
  MAX_RETRIES: 3,
} as const;

/**
 * ページネーション設定
 */
export const PAGINATION = {
  /** 1ページあたりのコメント数 */
  COMMENTS_PER_PAGE: 500,
} as const;

/**
 * ストレージキー
 * 
 * @important WXT Storage API 仕様について
 * UNREAD_TOTAL, CRAWLER_ENABLED, TRACK_BUTTON_VISIBLE などの`local:`プレフィックス付きキーは、
 * WXT の storage API (storage.getItem/setItem) で使用するための形式です。
 * 
 * SESSION_PREFIX と COMMENT_PREFIX は、実際のキー生成時に `local:` や `session:` を
 * 先頭に付加する必要があります（例: `local:comment:123:456`）。
 * 
 * このプレフィックスはWXTフレームワークの要件であり、省略できません。
 */
export const STORAGE_KEYS = {
  /** コメントプレフィックス（使用時は `local:comment:` となる） */
  COMMENT_PREFIX: 'comment:',
  /** 未読合計 */
  UNREAD_TOTAL: 'local:unreadTotal',
  /** クローラー有効化 */
  CRAWLER_ENABLED: 'local:crawler:enabled',
  /** 追跡ボタン表示 */
  TRACK_BUTTON_VISIBLE: 'local:track-button:visible',
  /** セッションプレフィックス（使用時は `session:` となる） */
  SESSION_PREFIX: 'session:',
} as const;

/**
 * URL パターン
 */
export const URL_PATTERNS = {
  /** トピックページ */
  TOPICS: '/topics/',
  /** コメントページ */
  COMMENT: '/comment/',
  /** コメント投稿ページ */
  MAKE_COMMENT: '/make_comment/',
} as const;

/**
 * サイト設定
 */
export const SITE_CONFIG = {
  /** サイトドメイン */
  DOMAIN: 'girlschannel.net',
  /** ベースURL */
  BASE_URL: 'https://girlschannel.net',
} as const;

/**
 * バッジ設定
 */
export const BADGE_CONFIG = {
  /** バッジ背景色 */
  BACKGROUND_COLOR: '#FF3B30',
  /** バッジテキスト色 */
  TEXT_COLOR: '#FFFFFF',
} as const;

/**
 * DOM セレクタ
 */
export const SELECTORS = {
  /** コメントアイテム */
  COMMENT_ITEM: '.comment-item',
  /** コメント本文 */
  COMMENT_BODY: '.body.lv1, .body.lv2, .body.lv3, .body.lv4, .body',
  /** 返信カウント */
  RES_COUNT: '.res-count .res-count-btn, .res-count-btn, .res-count a',
  /** 投稿日時 */
  POSTED_AT: 'p.info a',
  /** アクション要素 */
  ACTIONS: '.actions',
  /** 追跡ボタン */
  TRACK_BUTTON: '.track-comment-btn',
  /** コメント画像 */
  COMMENT_IMG: '.comment-img',
  /** コメントURL */
  COMMENT_URL: '.comment-url',
  /** h1要素 */
  H1: 'h1',
  /** OGタイトル */
  OG_TITLE: 'meta[property="og:title"]',
} as const;

/**
 * CSS クラス名
 */
export const CLASS_NAMES = {
  /** 追跡ボタン */
  TRACK_BUTTON: 'track-comment-btn',
  /** 追跡アイコン */
  TRACK_ICON: 'track-icon',
} as const;

/**
 * アイコンパス
 */
export const ICONS = {
  /** ピンクハートSVG */
  PINK_HEART_SVG: 'icon/heart_pink128.svg',
} as const;

/**
 * テキスト置換
 */
export const TEXT_REPLACEMENTS = {
  /** 画像置換テキスト */
  IMAGE: '【画像】',
  /** 引用置換テキスト */
  QUOTE: '【引用】',
} as const;

/**
 * 正規表現パターン
 */
export const REGEX_PATTERNS = {
  /** 返信数パターン */
  RES_COUNT: /(\d+)\s*件の返信/,
  /** トピックURL（ページ番号付き） */
  TOPICS_HREF: /\/topics\/(\d+)\/(\d+)#comment(\d+)/,
  /** コメントアンカー */
  COMMENT_ANCHOR: /#comment(\d+)/,
} as const;

/**
 * 楽観ロック設定
 */
export const OPTIMISTIC_LOCK = {
  /** 最大リトライ回数 */
  MAX_RETRIES: 3,
  /** 初期待機時間（ミリ秒） */
  INITIAL_BACKOFF_MS: 100,
} as const;

/**
 * コメントエントリー設定
 */
export const COMMENT_ENTRY_CONFIG = {
  /** 保存可能な最大エントリー数（LRU方式で古いエントリーから削除） */
  MAX_ENTRIES: 1000,
} as const;
