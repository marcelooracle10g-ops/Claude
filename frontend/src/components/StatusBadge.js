import React from 'react';

const STATUS_LABELS = {
  pending: 'Pendente',
  sent_to_bling: 'Enviado ao Bling',
  approved: 'Aprovado',
  invoiced: 'Faturado',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  scheduled: 'Agendado',
  paid: 'Pago',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
