import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Loading from '../../components/Loading';
import StatusBadge from '../../components/StatusBadge';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', brand_id: '', representative_id: '', start_date: '', end_date: '', page: 1 });
  const [brands, setBrands] = useState([]);
  const [reps, setReps] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    Promise.all([api.getBrands(), api.getRepresentatives()])
      .then(([b, r]) => { setBrands(b); setReps(r); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const data = await api.getOrders(params);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      loadOrders();
      if (selectedOrder?.id === orderId) {
        const updated = await api.getOrder(orderId);
        setSelectedOrder(updated);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const formatCurrency = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  return (
    <div>
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Pedidos</h2>

      <div className="filter-row">
        <select className="form-input" value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}>
          <option value="">Todos Status</option>
          <option value="pending">Pendente</option>
          <option value="sent_to_bling">Enviado</option>
          <option value="approved">Aprovado</option>
          <option value="invoiced">Faturado</option>
          <option value="shipped">Despachado</option>
          <option value="delivered">Entregue</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select className="form-input" value={filters.brand_id}
          onChange={(e) => setFilters((f) => ({ ...f, brand_id: e.target.value, page: 1 }))}>
          <option value="">Todas Marcas</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="form-input" value={filters.representative_id}
          onChange={(e) => setFilters((f) => ({ ...f, representative_id: e.target.value, page: 1 }))}>
          <option value="">Todos Reps</option>
          {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div className="filter-row">
        <input type="date" className="form-input" value={filters.start_date}
          onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value, page: 1 }))} />
        <input type="date" className="form-input" value={filters.end_date}
          onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value, page: 1 }))} />
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 12 }}>{total} pedidos encontrados</p>

      {loading ? <Loading /> : (
        <>
          {/* Mobile list view */}
          {orders.map((order) => (
            <div key={order.id} className="card" style={{ cursor: 'pointer', marginBottom: 8 }}
              onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>#{order.id} - {order.customer_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                    {order.representative_name} | {order.brand_name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-light)' }}>{formatDate(order.created_at)}</p>
                  <p style={{ fontWeight: 600, color: 'var(--success)', marginTop: 4 }}>{formatCurrency(order.total)}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              {selectedOrder?.id === order.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Alterar Status:</p>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {['approved', 'invoiced', 'shipped', 'delivered', 'cancelled'].map((s) => (
                      <button key={s} className="btn btn-outline btn-sm"
                        style={{ width: 'auto', fontSize: 11 }}
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, s); }}>
                        {s === 'approved' ? 'Aprovar' : s === 'invoiced' ? 'Faturar' :
                         s === 'shipped' ? 'Despachar' : s === 'delivered' ? 'Entregar' : 'Cancelar'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {total > 50 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button className="btn btn-outline btn-sm" disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Anterior</button>
              <span style={{ padding: '8px 16px', fontSize: 13 }}>Pag. {filters.page}</span>
              <button className="btn btn-outline btn-sm"
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Proxima</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
