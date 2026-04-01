import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';
import Loading from '../../components/Loading';

const COLORS = ['#1e293b', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start_date: '', end_date: '' });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async (params = {}) => {
    try {
      setLoading(true);
      const dashboard = await api.getDashboard(params);
      setData(dashboard);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    const params = {};
    if (dateRange.start_date) params.start_date = dateRange.start_date;
    if (dateRange.end_date) params.end_date = dateRange.end_date;
    loadDashboard(params);
  };

  const formatCurrency = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  if (loading) return <Loading />;
  if (!data) return null;

  const statusLabels = {
    pending: 'Pendente', sent_to_bling: 'Enviado', approved: 'Aprovado',
    invoiced: 'Faturado', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado',
  };

  const statusChartData = (data.ordersByStatus || []).map((s) => ({
    name: statusLabels[s.status] || s.status,
    value: s.count,
    revenue: s.revenue,
  }));

  return (
    <div>
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Dashboard</h2>

      <div className="filter-row">
        <input type="date" className="form-input" value={dateRange.start_date}
          onChange={(e) => setDateRange((r) => ({ ...r, start_date: e.target.value }))} />
        <input type="date" className="form-input" value={dateRange.end_date}
          onChange={(e) => setDateRange((r) => ({ ...r, end_date: e.target.value }))} />
        <button className="btn btn-primary btn-sm" onClick={handleFilter}>Filtrar</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data.totalOrders}</div>
          <div className="stat-label">Total Pedidos</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(data.totalRevenue)}</div>
          <div className="stat-label">Faturamento</div>
        </div>
        <div className="stat-card info">
          <div className="stat-value">{data.totalRepresentatives}</div>
          <div className="stat-label">Representantes</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--warning)' }}>
          <div className="stat-value" style={{ fontSize: 18, color: 'var(--warning)' }}>{formatCurrency(data.pendingCommissions)}</div>
          <div className="stat-label">Comissoes Pendentes</div>
        </div>
      </div>

      {/* Sales by Brand */}
      <div className="card">
        <div className="card-title">Vendas por Marca</div>
        {(data.ordersByBrand || []).map((brand) => (
          <div key={brand.brand_id} style={{
            display: 'flex', justifyContent: 'space-between', padding: '10px 0',
            borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <p style={{ fontWeight: 600 }}>{brand.brand_name}</p>
              <p style={{ fontSize: 12, color: 'var(--text-light)' }}>{brand.count} pedidos</p>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(brand.revenue)}</span>
          </div>
        ))}
      </div>

      {/* Monthly Sales Chart */}
      <div className="card">
        <div className="card-title">Vendas Mensais</div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlySales || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="revenue" name="Faturamento" fill="#1e293b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders by Status */}
      <div className="card">
        <div className="card-title">Pedidos por Status</div>
        <div className="chart-container" style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {statusChartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Representatives */}
      <div className="card">
        <div className="card-title">Top Representantes</div>
        {(data.topRepresentatives || []).map((rep, idx) => (
          <div key={rep.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
              }}>
                {idx + 1}
              </span>
              <div>
                <p style={{ fontWeight: 600, fontSize: 13 }}>{rep.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>{rep.total_orders} pedidos</p>
              </div>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(rep.total_revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
