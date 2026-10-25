import type { ImageRef } from '@inkvision/shared-types';

import { type AppConfigService } from '../../../config/configuration.js';

export interface MediaAssetRow {
  id: string;
  storageKey: string;
  mimeType: string;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  isPublic: boolean;
}

/**
 * Turns a stored asset into a public image reference.
 *
 * Returns null for private assets: product deliverables and other private files
 * must never be addressable from a public payload. They are reached only
 * through signed, authorised download routes.
 */
export function toImageRef(
  asset: MediaAssetRow | null | undefined,
  config: AppConfigService,
): ImageRef | null {
  if (!asset?.isPublic) return null;

  return {
    url: `${config.publicApiUrl}/${config.globalPrefix}/v1/media/${asset.id}`,
    // Alternative text is required by the contract; an asset saved without one
    // falls back to empty, which marks it decorative rather than inventing a
    // description.
    alt: asset.alt ?? '',
    ...(asset.width !== null ? { width: asset.width } : {}),
    ...(asset.height !== null ? { height: asset.height } : {}),
    ...(asset.caption !== null ? { caption: asset.caption } : {}),
  };
}
