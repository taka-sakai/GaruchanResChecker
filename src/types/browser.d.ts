/**
 * @file Browser API型拡張
 * @description TypeScriptでのBrowser API利用時の型安全性向上
 * @remarks WebExtensions APIの型定義を補完し、TypeScriptコンパイラの型チェックを機能させる
 */

/**
 * Tab情報の型定義
 * @description browser.tabs APIで取得されるTabオブジェクトの部分型
 */
export interface Tab {
  /** タブID */
  id?: number;
  /** タブのURL */
  url?: string;
  /** アクティブ状態 */
  active?: boolean;
  /** 所属するウィンドウID */
  windowId?: number;
}

/**
 * アクティブ情報の型定義
 * @description browser.tabs.onActivatedイベントで渡される情報
 */
export interface ActiveInfo {
  /** アクティブになったタブID */
  tabId: number;
  /** ウィンドウID */
  windowId: number;
}

/**
 * 変更情報の型定義
 * @description browser.tabs.onUpdatedイベントで渡される変更情報
 */
export interface ChangeInfo {
  /** 変更後のURL */
  url?: string;
  /** 読み込み状態 */
  status?: 'loading' | 'complete';
}

/**
 * ストレージ変更の型定義
 * @description browser.storage.onChangedイベントで渡される変更情報
 * @template T - ストレージに保存される値の型
 */
export interface StorageChange<T = unknown> {
  /** 変更前の値 */
  oldValue?: T;
  /** 変更後の値 */
  newValue?: T;
}

/**
 * ストレージエリアの型定義
 * @description browser.storage APIで使用可能なストレージ領域
 */
export type StorageArea = 'local' | 'sync' | 'session';
