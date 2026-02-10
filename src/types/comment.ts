/**
 * @file コメントエントリー型定義
 * @description ユーザーが追跡するコメントのデータ構造を定義
 */

/**
 * コメントエントリーのインターフェース
 * @description ユーザーが投稿したコメントを追跡するためのデータ構造
 */
export interface CommentEntry {
  /** トピックID */
  topicId: string;
  /** トピックタイトル */
  topicTitle: string | null;
  /** コメント番号 */
  commentNumber: string;
  /** 投稿日時（日本時間フォーマット） */
  postedAt: string | null;
  /** コメント本文 */
  commentBody: string | null;
  /** 返信数（最終更新時） */
  resCount: number;
  /** 未読数（resCountの増分） */
  unreadCount: number;
  /** 作成日時（ISO 8601） */
  createdAt: string;
  /** 更新日時（ISO 8601） */
  updatedAt: string;
  /** 楽観ロック用バージョン番号 */
  version?: number;
}
