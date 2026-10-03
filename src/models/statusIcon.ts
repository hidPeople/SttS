import { STATUS_DESCRIPTIONS } from '../data/statuses';
import { resolveIconFile } from './iconImage';

/** Share only the image, never the destination status's name, counts or fallback style. */
export function resolveStatusIconFile(
  status: string,
  files: ReadonlySet<string>,
  definitions: Record<string, { iconImage?: string }> = STATUS_DESCRIPTIONS,
): string | undefined {
  return resolveIconFile(status, files, definitions);
}
