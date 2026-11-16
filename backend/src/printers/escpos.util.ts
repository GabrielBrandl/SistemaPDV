/** Helpers ESC/POS (texto térmico 48 cols típico) */

export function escInit(): Buffer {
  return Buffer.from([0x1b, 0x40]);
}

export function escAlign(mode: 'left' | 'center' | 'right'): Buffer {
  const n = mode === 'center' ? 1 : mode === 'right' ? 2 : 0;
  return Buffer.from([0x1b, 0x61, n]);
}

export function escBold(on: boolean): Buffer {
  return Buffer.from([0x1b, 0x45, on ? 1 : 0]);
}

export function escCut(): Buffer {
  return Buffer.from([0x1d, 0x56, 0x00]);
}

export function escText(text: string): Buffer {
  // CP850-ish: strip accents for generic thermal printers
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n\r\t]/g, '?');
  return Buffer.from(normalized, 'ascii');
}

export function line(char = '-', width = 42): string {
  return char.repeat(width) + '\n';
}

export function buildTicket(opts: {
  title: string;
  station: string;
  orderId: string;
  lines: { qty: number; name: string }[];
  total?: number;
  footer?: string;
}): Buffer {
  const chunks: Buffer[] = [
    escInit(),
    escAlign('center'),
    escBold(true),
    escText(`${opts.title}\n`),
    escBold(false),
    escText(`${opts.station}\n`),
    escAlign('left'),
    escText(line()),
    escText(`Pedido: ${opts.orderId.slice(0, 8).toUpperCase()}\n`),
    escText(`Hora: ${new Date().toLocaleString('pt-BR')}\n`),
    escText(line()),
  ];

  for (const item of opts.lines) {
    chunks.push(escText(`${item.qty}x  ${item.name}\n`));
  }

  if (opts.total != null) {
    chunks.push(escText(line()));
    chunks.push(escBold(true));
    chunks.push(escText(`TOTAL  R$ ${opts.total.toFixed(2)}\n`));
    chunks.push(escBold(false));
  }

  if (opts.footer) {
    chunks.push(escText(line()));
    chunks.push(escAlign('center'));
    chunks.push(escText(`${opts.footer}\n`));
  }

  chunks.push(escText('\n\n\n'));
  chunks.push(escCut());
  return Buffer.concat(chunks);
}
