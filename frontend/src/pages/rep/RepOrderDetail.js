import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loading from '../../components/Loading';
import StatusBadge from '../../components/StatusBadge';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function RepOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  useEffect(() => {
    api.getOrder(id)
      .then(setOrder)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [id, showToast]);

  const handleSendToBling = async () => {
    try {
      await api.sendOrderToBling(id);
      showToast('Pedido enviado ao Bling!', 'success');
      const updated = await api.getOrder(id);
      setOrder(updated);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const formatCurrency = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  if (loading) return <Loading />;
  if (!order) return <div className="empty-state"><p>Pedido nao encontrado</p></div>;

  return (
    <div>
      <Toast toast={toast} />
      <button onClick={() => navigate('/rep/orders')} style={{
        background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
        color: 'var(--info)', marginBottom: 12, padding: 0,
      }}>
        &larr; Voltar
      </button>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18 }}>Pedido #{order.id}</h2>
          <StatusBadge status={order.status} />
        </div>

        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <p><strong>Cliente:</strong> {order.customer_name}</p>
          <p><strong>Documento:</strong> {order.customer_document || '-'}</p>
          <p><strong>Marca:</strong> {order.brand_name}</p>
          <p><strong>Data:</strong> {formatDate(order.created_at)}</p>
          {order.bling_order_id && <p><strong>ID Bling:</strong> {order.bling_order_id}</p>}
          {order.price_table_name && <p><strong>Tabela de Preco:</strong> {order.price_table_name}</p>}
          {order.notes && <p><strong>Obs:</strong> {order.notes}</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Itens</div>
        {(order.items || []).map((item, idx) => (
          <div key={idx} style={{
            display: 'flex', justifyContent: 'space-between', padding: '8px 0',
            borderBottom: idx < order.items.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 13 }}>{item.product_name}</p>
              <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                {item.quantity}x {formatCurrency(item.unit_price)}
              </p>
            </div>
            <span style={{ fontWeight: 600 }}>{formatCurrency(item.total_price)}</span>
          </div>
        ))}

        <div style={{ borderTop: '2px solid var(--border)', marginTop: 12, paddingTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Desconto</span><span>- {formatCurrency(order.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, marginTop: 8 }}>
            <span>Total</span><span style={{ color: 'var(--success)' }}>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {order.commission && (
        <div className="card">
          <div className="card-title">Comissao</div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <p><strong>Taxa:</strong> {order.commission.commission_rate}%</p>
            <p><strong>Valor:</strong> {formatCurrency(order.commission.commission_value)}</p>
            <p><strong>Status:</strong> <StatusBadge status={order.commission.status} /></p>
            {order.commission.payment_date && <p><strong>Data Pagamento:</strong> {formatDate(order.commission.payment_date)}</p>}
          </div>
        </div>
      )}

      {order.status === 'pending' && (
        <button className="btn btn-accent" onClick={handleSendToBling}>
          Enviar ao Bling
        </button>
      )}
    </div>
  );
}
