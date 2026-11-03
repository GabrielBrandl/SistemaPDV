import { RechargeFlow } from '../components/RechargeFlow';

export function RechargePage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Totem de Recarga</h2>
      <p className="mb-4 max-w-lg text-sm text-slate-400">
        Recarga de saldo em pulseira NFC com pagamento confirmado.
      </p>
      <RechargeFlow />
    </div>
  );
}
