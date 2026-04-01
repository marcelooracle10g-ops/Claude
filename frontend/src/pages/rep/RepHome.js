import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import Loading from '../../components/Loading';

export default function RepHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ordersData, commissionData] = await Promise.all([
          api.getOrders({ limit: 5 }),
          api.getCommissionSummary({}),
        ]);
        setRecentOrders(ordersData.orders || []);
        setStats(commissionData.totals);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <Loading />;

  const formatCurrency = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>Ola, {user?.name?.split(' ')[0]}!</h2>
      <p style={{ color: 'var(--text-light)', fontSize: 13, marginBottom: 16 }}>
        Bem-vindo ao sistema de pedidos
      </p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.total_orders || 0}</div>
          <div className="stat-label">Total Pedidos</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-value">{formatCurrency(stats?.total_sales)}</div>
          <div className="stat-label">Total Vendas</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{formatCurrency(stats?.paid_commission)}</div>
          <div className="stat-label">Comissao Paga</div>
        </div>
        <div className="stat-card info">
          <div className="stat-value">{formatCurrency(stats?.pending_commission)}</div>
          <div className="stat-label">Comissao Pendente</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => navigate('/rep/products')}>
          Novo Pedido
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/rep/customers')}>
          Clientes
        </button>
      </div>

      <div className="card">
        <div className="card-title">Pedidos Recentes</div>
        {recentOrders.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-light)' }}>Nenhum pedido ainda</p>
        ) : (
          recentOrders.map((order) => (
            <div key={order.id} className="list-item" onClick={() => navigate(`/rep/orders/${order.id}`)}>
              <div className="list-item-info">
                <h3>#{order.id} - {order.customer_name}</h3>
                <p>{order.brand_name} - {formatCurrency(order.total)}</p>
              </div>
              <span className={`badge badge-${order.status}`}>
                {order.status === 'pending' ? 'Pendente' :
                 order.status === 'sent_to_bling' ? 'Enviado' :
                 order.status === 'approved' ? 'Aprovado' :
                 order.status === 'delivered' ? 'Entregue' : order.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
