import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';
import Loading from '../../components/Loading';
import StatusBadge from '../../components/StatusBadge';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981'];

export default function RepCommissions() {
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [commData, summaryData] = await Promise.all([
        api.getCommissions({}),
        api.getCommissionSummary({ group_by: 'month' }),
      ]);
      setCommissions(commData.commissions || []);
      setSummary(summaryData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  if (loading) return <Loading />;

  const totals = summary?.totals || {};
  const statusData = (summary?.byStatus || []).map((s) => ({
    name: s.status === 'pending' ? 'Pendente' : s.status === 'scheduled' ? 'Agendado' : 'Pago',
    value: s.total_value || 0,
  }));

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Minhas Comissoes</h2>

      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(totals.total_commission)}</div>
          <div className="stat-label">Total Comissao</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(totals.paid_commission)}</div>
          <div className="stat-label">Pago</div>
        </div>
        <div className="stat-card info">
          <div className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(totals.scheduled_commission)}</div>
          <div className="stat-label">Agendado</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(totals.pending_commission)}</div>
          <div className="stat-label">Pendente</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Graficos</button>
        <button className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Detalhes</button>
      </div>

      {tab === 'overview' ? (
        <>
          <div className="card">
            <div className="card-title">Comissoes por Mes</div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary?.byPeriod || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="total_commission" name="Comissao" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_sales" name="Vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Distribuicao por Status</div>
            <div className="chart-container" style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div>
          {commissions.length === 0 ? (
            <div className="empty-state"><p>Nenhuma comissao encontrada</p></div>
          ) : (
            commissions.map((c) => (
              <div key={c.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>Pedido #{c.order_id} - {c.customer_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      {c.brand_name} - {formatDate(c.order_date)}
                    </p>
                    <p style={{ fontSize: 12 }}>
                      Venda: {formatCurrency(c.order_total)} | Taxa: {c.commission_rate}%
                    </p>
                    <p style={{ fontWeight: 700, color: 'var(--accent-dark)' }}>
                      Comissao: {formatCurrency(c.commission_value)}
                    </p>
                    {c.payment_date && (
                      <p style={{ fontSize: 11, color: 'var(--info)' }}>
                        Pagamento: {formatDate(c.payment_date)}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
