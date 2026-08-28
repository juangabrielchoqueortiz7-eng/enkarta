import type { Block } from '@/lib/types';
import { resolveInvitationTypography, type InvitationTypeRole } from '@/lib/marfil-visual-system';
import { useBlockDesign } from './theme';

/** Shared by the current Marfil sections; legacy blocks keep their existing defaults. */
export function useBlockTypography(block?: Block) {
  const tokens = useBlockDesign();
  const scale = typeof block?.props.__responsiveFontScale === 'number' ? block.props.__responsiveFontScale : 1;
  return (role: InvitationTypeRole) => resolveInvitationTypography(tokens, role, scale);
}
