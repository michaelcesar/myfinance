/**
 * Layout raiz: fonte, tema sem piscar e provedores globais.
 *
 * @module app/layout
 */
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppProviders } from '@/providers/AppProviders';
import { THEME_INIT_SCRIPT } from '@/providers/ThemeProvider';
import './globals.css';

/**
 * Inter entra só como reserva: em Apple, a pilha de fontes usa a San
 * Francisco do sistema (`-apple-system`), cuja licença não permite servir
 * o arquivo pela web (`ADR-003` do web).
 */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Finance Manager', template: '%s · Finance Manager' },
  description: 'Finanças pessoais e das suas empresas, num lugar só.',
  applicationName: 'Finance Manager',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * HTML base. `suppressHydrationWarning` no `<html>` porque o script de tema
 * escreve `data-theme` antes de o React hidratar.
 *
 * @param props - `children`
 * @returns Documento
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='pt-BR' className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
