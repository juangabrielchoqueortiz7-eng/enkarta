import Aurelia from '@/components/invitations/Aurelia';
import Velada from '@/components/invitations/Velada';
import Promesa from '@/components/invitations/Promesa';
import CasaLimone from '@/components/invitations/CasaLimone';
import JardinDeSeda from '@/components/invitations/JardinDeSeda';
import {isCleanDesign} from './clean-designs';
import CleanInvitation from '@/components/invitations/CleanInvitation';
import MariaMario from '@/components/invitations/MariaMario';
import KarlaMauricio from '@/components/invitations/KarlaMauricio';
import PaulaJuanFelipe from '@/components/invitations/PaulaJuanFelipe';
import MarianaJesus from '@/components/invitations/MarianaJesus';
import ManuelMaya from '@/components/invitations/ManuelMaya';
import NicoleFrancisco from '@/components/invitations/NicoleFrancisco';
import RolyYeliana from '@/components/invitations/RolyYeliana';
import AnnieMicky from '@/components/invitations/AnnieMicky';
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
import Provence from '@/components/invitations/Provence';
import Esmeralda from '@/components/invitations/Esmeralda';
import LauraAndres from '@/components/invitations/LauraAndres';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PremiumEntry {
  Comp: React.ComponentType<{ data: any; preview?: boolean; demo?: boolean; skipEntry?: boolean; deadlinePassed?: boolean }>;
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
