/**
 * Cartão de backup das Configurações: exportar todos os dados num arquivo e
 * restaurar a partir dele.
 *
 * Exportar baixa um JSON (`finance-manager-backup-AAAA-MM-DD.json`) com todas
 * as tabelas. Importar lê o arquivo, mostra de quando ele é e quanto tem, e
 * só substitui os dados depois da confirmação — a API faz a troca numa
 * transação, então um arquivo ruim não deixa nada pela metade.
 *
 * @module components/finance/BackupCard
 */
'use client';

import { Download, Upload } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, SectionHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ButtonSkeleton, SectionHeaderSkeleton, SkeletonText } from '@/components/ui/SkeletonKit';
import { useFinanceMutation } from '@/hooks/useFinance';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/providers/ToastProvider';
import { type BackupFile, backupService } from '@/services/finance.service';

/** Textos fixos do cartão — a tela e o esqueleto usam os mesmos. */
const COPY = {
  title: 'Backup',
  subtitle: 'Exporte um arquivo com todos os seus dados e restaure quando precisar.',
  export: 'Exportar dados',
  import: 'Restaurar backup',
  hint: 'Guarde o arquivo fora deste computador. Restaurar substitui todos os dados atuais pelos do arquivo.',
} as const;

/** Respiro do cartão. */
const CARD_PADDING_CLASS = 'p-5';

/** Fileira dos botões. */
const ACTIONS_CLASS = 'flex flex-wrap gap-2';

/** Aviso embaixo dos botões. */
const HINT_CLASS = 'mt-3 px-1 text-caption text-fg-muted';

/**
 * Data de hoje no formato do nome do arquivo.
 *
 * @returns `AAAA-MM-DD` no fuso local
 */
function todayStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Baixa o backup como arquivo JSON.
 *
 * @param file - Backup exportado
 */
function downloadBackup(file: BackupFile): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `finance-manager-backup-${todayStamp()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Lê e confere o arquivo escolhido.
 *
 * @param file - Arquivo do seletor
 * @returns Backup, ou `null` quando não é um backup desta aplicação
 */
async function readBackup(file: File): Promise<BackupFile | null> {
  try {
    const parsed = JSON.parse(await file.text()) as Partial<BackupFile>;
    return parsed.format === 'finance-manager-backup' && parsed.data ? (parsed as BackupFile) : null;
  } catch {
    return null;
  }
}

/**
 * Frase de confirmação com a data e o tamanho do backup.
 *
 * @param file - Backup escolhido
 * @returns Texto do diálogo
 */
function confirmMessage(file: BackupFile): string {
  const date = new Date(file.exportedAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
  const transactions = file.counts.transactions ?? file.data.transactions.length;
  return `Todos os dados atuais serão trocados pelos do backup de ${date} (${transactions} lançamentos). Não dá para desfazer. Exporte antes se quiser guardar os atuais.`;
}

/**
 * Esqueleto do cartão de backup.
 *
 * @returns Cartão em esqueleto
 */
export function BackupCardSkeleton() {
  return (
    <Card className={CARD_PADDING_CLASS} aria-hidden>
      <SectionHeaderSkeleton title={COPY.title} subtitle={COPY.subtitle} />
      <div className={ACTIONS_CLASS}>
        <ButtonSkeleton label={COPY.export} icon />
        <ButtonSkeleton label={COPY.import} icon />
      </div>
      <SkeletonText className={HINT_CLASS} text={COPY.hint} />
    </Card>
  );
}

/**
 * Cartão de backup.
 *
 * @example
 * <BackupCard />
 */
export function BackupCard() {
  const { notify } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const restore = useFinanceMutation((file: BackupFile) => backupService.import(file), 'Backup restaurado.');

  /**
   * Exporta e baixa o arquivo.
   */
  async function handleExport() {
    setExporting(true);
    try {
      downloadBackup(await backupService.export());
      notify('Backup exportado.');
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Não foi possível exportar agora.', 'error');
    } finally {
      setExporting(false);
    }
  }

  /**
   * Lê o arquivo escolhido e abre a confirmação.
   *
   * @param event - Mudança do seletor de arquivo
   */
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) return;
    const file = await readBackup(chosen);
    if (!file) {
      notify('Este arquivo não é um backup do Finance Manager.', 'error');
      return;
    }
    setPending(file);
  }

  return (
    <Card className={CARD_PADDING_CLASS}>
      <SectionHeader title={COPY.title} subtitle={COPY.subtitle} />
      <div className={ACTIONS_CLASS}>
        <Button variant='secondary' icon={<Download className='size-4' />} loading={exporting} onClick={() => void handleExport()}>
          {COPY.export}
        </Button>
        <Button variant='secondary' icon={<Upload className='size-4' />} loading={restore.isPending} onClick={() => input.current?.click()}>
          {COPY.import}
        </Button>
        <input ref={input} type='file' accept='application/json,.json' className='hidden' onChange={event => void handleFile(event)} aria-label='Arquivo de backup' />
      </div>
      <p className={HINT_CLASS}>{COPY.hint}</p>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={open => !open && setPending(null)}
        title='Restaurar este backup?'
        message={pending ? confirmMessage(pending) : ''}
        confirmLabel='Substituir dados'
        destructive
        loading={restore.isPending}
        onConfirm={() => {
          if (!pending) return;
          restore.mutate(pending, { onSettled: () => setPending(null) });
        }}
      />
    </Card>
  );
}
