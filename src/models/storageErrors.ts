import { text, type LocalizedText } from './localization';

export type StorageOperation = 'save' | 'auto' | 'read' | 'delete' | 'settings';
export interface StorageFailure { error: unknown; operation: StorageOperation }
const failures: StorageFailure[] = [];
export function reportStorageError(error: unknown, operation: StorageOperation = 'save'): void {
  console.warn(`Storage operation failed (${operation})`, error);
  if (!failures.some(entry => entry.operation === operation)) failures.push({ error, operation });
}
export function takeStorageFailure(): StorageFailure | undefined { return failures.shift(); }
export function hasStorageFailures(): boolean { return failures.length > 0; }

/** Storage adapters should preserve native error codes. Paths are never parsed as shell commands. */
export function storageErrorMessage(error: unknown): LocalizedText {
  const value = error && typeof error === 'object' ? error as { code?: unknown; name?: unknown } : {};
  const code = String(value.code ?? '');
  const name = String(value.name ?? '');
  const messages: Record<string, [string, string]> = {
    QuotaExceededError: ['Storage capacity exceeded. Free space or delete unnecessary saves, then try again.', '保存容量の上限に達しました。空き容量を確保するか不要なセーブを削除して、再試行してください。'],
    ENOSPC: ['The drive is full. Free some disk space and try again.', 'ドライブの空き容量が不足しています。空き容量を確保して再試行してください。'],
    EACCES: ['Cannot write to the save folder. Check its permissions.', '保存先に書き込む権限がありません。保存先のアクセス権を確認してください。'],
    EROFS: ['The save location is read-only. Choose a writable location.', '保存先が読み取り専用です。書き込み可能な保存先を使用してください。'],
    EINVAL: ['The save path is invalid. Check for control characters or unsupported characters. Spaces are allowed.', '保存先のパスが不正です。制御文字や使用できない文字がないか確認してください。半角スペースは使用できます。'],
    ENAMETOOLONG: ['The save path is too long. Use a shorter path.', '保存先のパスが長すぎます。短いパスを使用してください。'],
    ENOENT: ['The save folder or drive could not be found. Check the save location.', '保存先フォルダやドライブが見つかりません。保存先を確認してください。'],
    EBUSY: ['The save file is in use. Close other applications using it, then retry.', '保存ファイルが使用中です。使用している他のアプリを閉じて再試行してください。'],
    EIO: ['A storage I/O error occurred. Check the drive connection and retry.', '保存先への入出力に失敗しました。ドライブの接続状態を確認して再試行してください。'],
    SecurityError: ['Storage is blocked. Check application/browser storage permissions.', '保存機能が制限されています。アプリ・ブラウザの保存権限を確認してください。'],
    StorageUnavailable: ['Storage is unavailable. Check the save location and restart the application.', '保存機能を利用できません。保存先を確認してアプリを再起動してください。'],
    SyntaxError: ['The save data could not be decoded. The original data has been preserved. Restore a backup or explicitly delete the damaged data.', 'セーブデータを解読できませんでした。元のデータは保護されています。バックアップを復元するか、破損データの削除を明示的に行ってください。'],
  };
  const aliases: Record<string, string> = { EPERM: 'EACCES', EDQUOT: 'QuotaExceededError', InvalidCharacterError: 'EINVAL', ENOTDIR: 'ENOENT', ETXTBSY: 'EBUSY', NotAllowedError: 'SecurityError', PermissionDenied: 'EACCES', NotFound: 'ENOENT', InvalidInput: 'EINVAL', StorageFull: 'ENOSPC', ReadOnlyFilesystem: 'EROFS', FileTooLarge: 'QuotaExceededError', ResourceBusy: 'EBUSY' };
  const message = messages[name] ?? messages[aliases[code] ?? code] ?? messages[aliases[name]] ?? ['Storage operation failed. Check free space and permissions, then retry.', '保存操作に失敗しました。空き容量とアクセス権を確認し、再試行してください。'];
  return text(...message);
}
