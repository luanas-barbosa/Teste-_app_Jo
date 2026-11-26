import { STATUS_INFO, type StatusContrato } from "@/lib/contratos";

export default function StatusBadge({ status, vence }: { status: StatusContrato; vence?: boolean }) {
  const info = STATUS_INFO[status];
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span title={info.descricao} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${info.classe}`}>
        {info.rotulo}
      </span>
      {vence && (
        <span title="A vigência termina nos próximos 90 dias" className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 ring-1 ring-inset ring-orange-600/20">
          ⏰ Vence em breve
        </span>
      )}
    </span>
  );
}
