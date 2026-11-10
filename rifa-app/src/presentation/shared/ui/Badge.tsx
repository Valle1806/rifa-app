import type { ReactNode } from 'react';
import type { AccessState, TicketState } from '../../../domain';
import { cn } from '../cn';
import { STATUS_META, TONE_CLASSES, type Tone } from '../statusMeta';

export const Badge = ({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide whitespace-nowrap',
      TONE_CLASSES[tone],
      className,
    )}
  >
    {children}
  </span>
);

export const StatusBadge = ({ state }: { state: TicketState | AccessState }) => (
  <Badge tone={STATUS_META[state].tone}>{STATUS_META[state].label}</Badge>
);
