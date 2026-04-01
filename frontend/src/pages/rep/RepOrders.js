import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loading from '../../components/Loading';
import StatusBadge from '../../components/StatusBadge';

export default function RepOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter) params.status = filter;
      const data = await api.getOrders(params);
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Meus Pedidos</h2>

      <div className="tabs">
        {[
          { value: '', label: 'Todos' },
          { value: 'pending', label: 'Pendentes' },
          { value: 'sent_to_bling', label: 'Enviados' },
          { value: 'approved', label: 'Aprovados' },
          { value: 'delivered', label: 'Entregues' },
        ].map((t) => (
          <button key={t.value} className={`tab ${filter === t.value ? 'active' : ''}`} onClick={() => setFilter(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : orders.length === 0 ? (
        <div className="empty-state"><p>Nenhum pedido encontrado</p></div>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="list-item" onClick={() => navigate(`/rep/orders/${order.id}`)}>
            <div className="list-item-info">
              <h3>Pedido #{order.id}</h3>
              <p>{order.customer_name}</p>
              <p>{order.brand_name} - {formatDate(order.created_at)}</p>
              <p style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(order.total)}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
        ))
      )}
    </div>
  );
}
