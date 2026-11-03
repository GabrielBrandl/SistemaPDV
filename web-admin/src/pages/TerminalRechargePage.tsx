import { RechargeFlow } from '../components/RechargeFlow';
import { TerminalShell } from '../components/TerminalShell';

export function TerminalRechargePage() {
  return (
    <TerminalShell title="Recarga">
      <RechargeFlow />
    </TerminalShell>
  );
}
