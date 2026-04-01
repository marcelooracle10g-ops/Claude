import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';
import Loading from '../../components/Loading';
import StatusBadge from '../../components/StatusBadge';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

export default function AdminCommissions() {
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [filters, setFilters] = useState({ representative_id: '', status: '', start_date: '', end_date: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchDate, setBatchDate] = useState('');
  const { toast, showToast } = useToast();

  useEffect(() => {
    api.getRepresentatives().then(setReps).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });

      const [commData, summaryData] = await Promise.all([
        api.getCommissions(params),
        api.getCommissionSummary({ ...params, group_by: 'month' }),
      ]);
      setCommissions(commData.commissions || []);
      setSummary(summaryData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSchedule = async () => {
    if (!batchDate || selectedIds.length === 0) {
      return showToast('Selecione comissoes e uma data', 'error');
    }
    try {
      await api.batchScheduleCommissions(selectedIds, batchDate);
      showToast(`${selectedIds.length} comissoes agendadas`, 'success');
      setSelectedIds([]);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleBatchPay = async () => {
    if (selectedIds.length === 0) return showToast('Selecione comissoes', 'error');
    try {
      await api.batchPayCommissions(selectedIds);
      showToast(`${selectedIds.length} comissoes marcadas como pagas`, 'success');
      setSelectedIds([]);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === commissions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(commissions.map((c) => c.id));
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
      <Toast toast={toast} />
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Comissoes</h2>

      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-value" style={{ fontSize: 16 }}>{formatCurrency(totals.total_commission)}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 16 }}>{formatCurrency(totals.pending_commission)}</div>
          <div className="stat-label">Pendente</div>
        </div>
        <div className="stat-card info">
          <div className="stat-value" style={{ fontSize: 16 }}>{formatCurrency(totals.scheduled_commission)}</div>
          <div className="stat-label">Agendado</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value" style={{ fontSize: 16 }}>{formatCurrency(totals.paid_commission)}</div>
          <div className="stat-label">Pago</div>
        </div>
      </div>

      <div className="filter-row">
        <select className="form-input" value={filters.representative_id}
          onChange={(e) => setFilters((f) => ({ ...f, representative_id: e.target.value }))}>
          <option value="">Todos Representantes</option>
          {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="form-input" value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">Todos Status</option>
          <option value="pending">Pendente</option>
          <option value="scheduled">Agendado</option>
          <option value="paid">Pago</option>
        </select>
      </div>
      <div className="filter-row">
        <input type="date" className="form-input" value={filters.start_date}
          onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value }))} />
        <input type="date" className="form-input" value={filters.end_date}
          onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value }))} />
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Graficos</button>
        <button className={`tab ${tab === 'by-rep' ? 'active' : ''}`} onClick={() => setTab('by-rep')}>Por Representante</button>
        <button className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Lista Detalhada</button>
      </div>

      {tab === 'overview' && (
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
                  <Bar dataKey="total_sales" name="Vendas" fill="#1e293b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Status das Comissoes</div>
            <div className="chart-container" style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
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
      )}

      {tab === 'by-rep' && (
        <div className="card">
          <div className="card-title">Comissoes por Representante</div>
          {(summary?.byRepresentative || []).map((rep) => (
            <div key={rep.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <p style={{ fontWeight: 600 }}>{rep.representative_name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  {rep.total_orders} pedidos | Taxa media: {(rep.avg_rate || 0).toFixed(1)}%
                </p>
                <p style={{ fontSize: 12 }}>Vendas: {formatCurrency(rep.total_sales)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 700, color: 'var(--accent-dark)', fontSize: 16 }}>
                  {formatCurrency(rep.total_commission)}
                </p>
              </div>
            </div>
          ))}

          {/* Representative commission chart */}
          <div className="chart-container" style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(summary?.byRepresentative || []).map((r) => ({
                name: r.representative_name?.split(' ')[0] || '',
                comissao: r.total_commission,
                vendas: r.total_sales,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="comissao" name="Comissao" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vendas" name="Vendas" fill="#1e293b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <>
          {/* Batch actions */}
          {selectedIds.length > 0 && (
            <div className="card" style={{ background: 'var(--primary)', color: 'white', position: 'sticky', top: 60, zIndex: 50 }}>
              <p style={{ fontSize: 13, marginBottom: 8 }}>{selectedIds.length} comissoes selecionadas</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="date" className="form-input" value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  style={{ flex: 1, minWidth: 140, color: 'var(--text)' }} />
                <button className="btn btn-accent btn-sm" onClick={handleBatchSchedule}>Agendar</button>
                <button className="btn btn-success btn-sm" onClick={handleBatchPay}>Marcar Pago</button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={selectedIds.length === commissions.length && commissions.length > 0}
                onChange={selectAll} />
              Selecionar todas
            </label>
          </div>

          {commissions.length === 0 ? (
            <div className="empty-state"><p>Nenhuma comissao encontrada</p></div>
          ) : (
            commissions.map((c) => (
              <div key={c.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelect(c.id)} style={{ marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13 }}>{c.representative_name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                          Pedido #{c.order_id} - {c.customer_name}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                          {c.brand_name} | {formatDate(c.order_date)}
                        </p>
                        <p style={{ fontSize: 12 }}>
                          Venda: {formatCurrency(c.order_total)} | Taxa: {c.commission_rate}%
                        </p>
                        <p style={{ fontWeight: 700, color: 'var(--accent-dark)' }}>
                          {formatCurrency(c.commission_value)}
                        </p>
                        {c.payment_date && (
                          <p style={{ fontSize: 11, color: 'var(--info)' }}>Pgto: {formatDate(c.payment_date)}</p>
                        )}
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
