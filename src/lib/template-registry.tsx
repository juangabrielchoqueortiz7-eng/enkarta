/**
 * Registry central de plantillas premium: key → { Comp, map }.
 *
 * Único punto de registro para renderizar una plantilla a partir de una
 * invitación parseada. Lo consumen `/i/[slug]`, `/muestra/[template]` y
 * `LivePreview`. Para añadir una plantilla nueva: import + una entrada aquí,
 * su sample en `/muestra` y su tema de entrada en `entry/config.ts`.
 */
import type React from 'react';
import type { InvitationParsed } from '@/lib/types';
import {
  mapToAzure, mapToPrimicia, mapToPassport, mapToParadise,
  mapToObsidiana, mapToDolceVita, mapToGrazia,
} from '@/lib/invitation-mapper';
import Azure from '@/components/invitations/Azure';
import Primicia from '@/components/invitations/Primicia';
import Passport from '@/components/invitations/Passport';
import Paradise from '@/components/invitations/Paradise';
import Obsidiana from '@/components/invitations/Obsidiana';
import DolceVita from '@/components/invitations/DolceVita';
import Grazia from '@/components/invitations/Grazia';
import CarmesiV2 from '@/components/invitations/Carmesi';
import Napoly from '@/components/invitations/Napoly';
import Euforia from '@/components/invitations/Euforia';
import RoseGold from '@/components/invitations/RoseGold';
import Allegria from '@/components/invitations/Allegria';
import Provenza from '@/components/invitations/Provenza';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PremiumEntry {
  Comp: React.ComponentType<{ data: any }>;
  /** Mapper fila → props de la plantilla (con defaults). */
  map: (inv: InvitationParsed) => any;
}

export const PREMIUM_REGISTRY: Record<string, PremiumEntry> = {
  azure:      { Comp: Azure,     map: mapToAzure },
  primicia:   { Comp: Primicia,  map: mapToPrimicia },
  passport:   { Comp: Passport,  map: mapToPassport },
  paradise:   { Comp: Paradise,  map: mapToParadise },
  obsidiana:  { Comp: Obsidiana, map: mapToObsidiana },
  dolcevita:  { Comp: DolceVita, map: mapToDolceVita },
  grazia:     { Comp: Grazia,    map: mapToGrazia },
  // Variantes que comparten la estructura de DolceVita (solo cambia el estilo).
  carmesi_v2: { Comp: CarmesiV2, map: mapToDolceVita },
  napoly:     { Comp: Napoly,    map: mapToDolceVita },
  euforia:    { Comp: Euforia,   map: mapToDolceVita },
  rosegold:   { Comp: RoseGold,  map: mapToDolceVita },
  allegria:   { Comp: Allegria,  map: mapToDolceVita },
  provenza:   { Comp: Provenza,  map: mapToDolceVita },
};

/** Keys de las plantillas premium (con builder visual). */
export const PREMIUM_KEYS = Object.keys(PREMIUM_REGISTRY);
