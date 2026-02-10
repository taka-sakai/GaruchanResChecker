/**
 * @file ページネーション計算ユーティリティ
 */
import { PAGINATION } from '../constants/app-config';

/**
 * ページ番号を動的に算出する
 * @param commentNumber - コメント番号
 * @returns ページ番号
 */
export function calculatePageNumber(commentNumber: string): string {
  const n = parseInt(commentNumber, 10);
  if (isNaN(n) || n <= 0) {
    return '1';
  } else {
    return String(Math.floor((n - 1) / PAGINATION.COMMENTS_PER_PAGE) + 1);
  }
}
