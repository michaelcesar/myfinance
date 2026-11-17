/**
 * Ícones disponíveis para categorias e escolhas do usuário.
 *
 * A API guarda o nome kebab-case do `lucide-react` (`shopping-cart`). Aqui o
 * nome vira o componente. A lista é curada de propósito: importar o pacote
 * inteiro de ícones pesaria centenas de kB no bundle.
 *
 * @module lib/icons
 */
import {
  AppWindow,
  Banknote,
  Briefcase,
  Building2,
  Calculator,
  Car,
  CircleDollarSign,
  CirclePlus,
  Coffee,
  CreditCard,
  Dumbbell,
  Ellipsis,
  Fuel,
  Gift,
  GraduationCap,
  Handshake,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  type LucideIcon,
  Megaphone,
  Package,
  PartyPopper,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';

/** Mapa nome → componente. */
export const ICONS: Record<string, LucideIcon> = {
  'app-window': AppWindow,
  banknote: Banknote,
  briefcase: Briefcase,
  'building-2': Building2,
  calculator: Calculator,
  car: Car,
  'circle-dollar-sign': CircleDollarSign,
  'circle-plus': CirclePlus,
  coffee: Coffee,
  'credit-card': CreditCard,
  dumbbell: Dumbbell,
  ellipsis: Ellipsis,
  fuel: Fuel,
  gift: Gift,
  'graduation-cap': GraduationCap,
  handshake: Handshake,
  'heart-pulse': HeartPulse,
  house: House,
  landmark: Landmark,
  laptop: Laptop,
  megaphone: Megaphone,
  package: Package,
  'party-popper': PartyPopper,
  'paw-print': PawPrint,
  'piggy-bank': PiggyBank,
  plane: Plane,
  receipt: Receipt,
  repeat: Repeat,
  shirt: Shirt,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  smartphone: Smartphone,
  sparkles: Sparkles,
  tag: Tag,
  'trending-up': TrendingUp,
  users: Users,
  utensils: Utensils,
  wallet: Wallet,
  wifi: Wifi,
  wrench: Wrench,
  zap: Zap,
};

/** Nomes oferecidos no seletor de ícone. */
export const ICON_NAMES = Object.keys(ICONS);

/**
 * Resolve o componente de um ícone pelo nome, com `Tag` como reserva.
 *
 * @param name - Nome kebab-case
 * @returns Componente do ícone
 */
export function iconFor(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Tag;
}
