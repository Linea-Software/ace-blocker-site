/**
 * Server-only environment utilities.
 *
 * @deprecated Import {@link isProduction} from `$lib/env` instead.
 *   This file is kept for backward compatibility.
 */
import { isProduction as _isProduction, isDev as _isDev } from '$lib/env';

export const isProduction = _isProduction();
export const isDev = _isDev();
