import dynamic from 'next/dynamic';
const Aurelia = dynamic(() => import('@/components/invitations/Aurelia'));
const Velada = dynamic(() => import('@/components/invitations/Velada'));
const Promesa = dynamic(() => import('@/components/invitations/Promesa'));
const CasaLimone = dynamic(() => import('@/components/invitations/CasaLimone'));
const JardinDeSeda = dynamic(() => import('@/components/invitations/JardinDeSeda'));
import {isCleanDesign} from './clean-designs';
const CleanInvitation = dynamic(() => import('@/components/invitations/CleanInvitation'));
const MariaMario = dynamic(() => import('@/components/invitations/MariaMario'));
const KarlaMauricio = dynamic(() => import('@/components/invitations/KarlaMauricio'));
const PaulaJuanFelipe = dynamic(() => import('@/components/invitations/PaulaJuanFelipe'));
const MarianaJesus = dynamic(() => import('@/components/invitations/MarianaJesus'));
const ManuelMaya = dynamic(() => import('@/components/invitations/ManuelMaya'));
const NicoleFrancisco = dynamic(() => import('@/components/invitations/NicoleFrancisco'));
const RolyYeliana = dynamic(() => import('@/components/invitations/RolyYeliana'));
const AnnieMicky = dynamic(() => import('@/components/invitations/AnnieMicky'));
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
  mapToObsidiana, mapToDolceVita, mapToGrazia, mapToProvence,
} from '@/lib/invitation-mapper';
const Azure = dynamic(() => import('@/components/invitations/Azure'));
const Primicia = dynamic(() => import('@/components/invitations/Primicia'));
const Passport = dynamic(() => import('@/components/invitations/Passport'));
const Paradise = dynamic(() => import('@/components/invitations/Paradise'));
const ParadiseReference = dynamic(() => import('@/components/invitations/ParadiseReference'));
const AzureReference = dynamic(() => import('@/components/invitations/AzureReference'));
const Obsidiana = dynamic(() => import('@/components/invitations/Obsidiana'));
const DolceVita = dynamic(() => import('@/components/invitations/DolceVita'));
const Grazia = dynamic(() => import('@/components/invitations/Grazia'));
const CarmesiV2 = dynamic(() => import('@/components/invitations/Carmesi'));
const Napoly = dynamic(() => import('@/components/invitations/Napoly'));
const Euforia = dynamic(() => import('@/components/invitations/Euforia'));
const RoseGold = dynamic(() => import('@/components/invitations/RoseGold'));
const Allegria = dynamic(() => import('@/components/invitations/Allegria'));
const Provence = dynamic(() => import('@/components/invitations/Provence'));
const Esmeralda = dynamic(() => import('@/components/invitations/Esmeralda'));
const LauraAndres = dynamic(() => import('@/components/invitations/LauraAndres'));

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PremiumEntry {
  // Families have heterogeneous props; each dynamic import retains its own
  // signature and its mapper supplies the corresponding payload.
  Comp: React.ComponentType<any>;
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
  provence:   { Comp: Provence,  map: mapToProvence },
  // Variantes que comparten la estructura de DolceVita (solo cambia el estilo).
  carmesi_v2: { Comp: CarmesiV2, map: mapToDolceVita },
  napoly:     { Comp: Napoly,    map: mapToDolceVita },
  euforia:    { Comp: Euforia,   map: mapToDolceVita },
  rosegold:   { Comp: RoseGold,  map: mapToDolceVita },
  allegria:   { Comp: Allegria,  map: mapToDolceVita },
  esmeralda:  { Comp: Esmeralda, map: mapToDolceVita },
};

/** Keys de las plantillas premium (con builder visual). */
export const PREMIUM_KEYS = Object.keys(PREMIUM_REGISTRY);

const LAURA_ANDRES_ENTRY: PremiumEntry = { Comp: LauraAndres, map: inv => inv };
export function premiumFor(inv: InvitationParsed): PremiumEntry | undefined {
  if (inv.config.designKey === 'paradise-referencia') return { Comp: ParadiseReference, map: (inv: InvitationParsed) => inv };
  if (inv.config.designKey === 'azure-referencia') return { Comp: AzureReference, map: (inv: InvitationParsed) => inv };
  if(inv.config.designKey==='aurelia')return {Comp:Aurelia,map:(inv:InvitationParsed)=>inv};
  if(inv.config.designKey==='velada')return {Comp:Velada,map:(inv:InvitationParsed)=>inv};
  if(inv.config.designKey==='promesa')return {Comp:Promesa,map:(inv:InvitationParsed)=>inv};
  if(inv.config.designKey==='casa-limone')return {Comp:CasaLimone,map:(inv:InvitationParsed)=>inv};
  if(inv.config.designKey==='jardin-de-seda')return {Comp:JardinDeSeda,map:(inv:InvitationParsed)=>inv};
  if(isCleanDesign(inv.config.designKey))return {Comp:CleanInvitation,map:(inv:InvitationParsed)=>inv};
  if(inv.config.designKey === 'maria-angelica-y-mario') return {Comp:MariaMario,map:(inv:InvitationParsed)=>inv};
  if(inv.config.designKey === 'karla-y-mauricio') return {Comp:KarlaMauricio,map:(inv:InvitationParsed)=>inv};
  if(inv.config.designKey === 'paula-y-juan-felipe') return {Comp:PaulaJuanFelipe,map:(inv:InvitationParsed)=>inv};
  if(inv.config.designKey === 'mariana-y-jesus') return {Comp:MarianaJesus,map:(inv:InvitationParsed)=>inv};
  if(inv.config.designKey === 'manuel-y-maya') return {Comp:ManuelMaya,map:(inv:InvitationParsed)=>inv};
  if(inv.config.designKey === 'nicole-y-francisco') return {Comp:NicoleFrancisco,map:(inv:InvitationParsed)=>inv};
  if(inv.config.designKey === 'roly-y-yeliana') return {Comp:RolyYeliana,map:(inv:InvitationParsed)=>inv};
  if(inv.config.designKey === 'annie-y-micky') return {Comp:AnnieMicky,map:(inv:InvitationParsed)=>inv};
  return inv.config.designKey === 'laura-y-andres' ? LAURA_ANDRES_ENTRY : PREMIUM_REGISTRY[inv.template];
}
