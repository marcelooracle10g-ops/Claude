import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Loading from '../../components/Loading';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function AdminRepresentatives() {
  const [reps, setReps] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', cpf: '', brand_id: '', commission_rate: 5.0 });
  const { toast, showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [repsData, brandsData] = await Promise.all([api.getRepresentatives(), api.getBrands()]);
      setReps(repsData);
      setBrands(brandsData);
    } catch (err) {
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (data.brand_id) data.brand_id = parseInt(data.brand_id);
      data.commission_rate = parseFloat(data.commission_rate);

      if (editingId) {
        if (!data.password) delete data.password;
        await api.updateRepresentative(editingId, data);
        showToast('Representante atualizado', 'success');
      } else {
        await api.createRepresentative(data);
        showToast('Representante criado', 'success');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', email: '', password: '', phone: '', cpf: '', brand_id: '', commission_rate: 5.0 });
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEdit = (rep) => {
    setForm({
      name: rep.name, email: rep.email, password: '', phone: rep.phone || '',
      cpf: rep.cpf || '', brand_id: rep.brand_id || '', commission_rate: rep.commission_rate,
    });
    setEditingId(rep.id);
    setShowForm(true);
  };

  const handleToggleActive = async (rep) => {
    try {
      await api.updateRepresentative(rep.id, { active: !rep.active });
      showToast(`Representante ${rep.active ? 'desativado' : 'ativado'}`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const formatCurrency = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  if (loading) return <Loading />;

  return (
    <div>
      <Toast toast={toast} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20 }}>Representantes</h2>
        <button className="btn btn-accent btn-sm" onClick={() => {
          setShowForm(!showForm);
          setEditingId(null);
          setForm({ name: '', email: '', password: '', phone: '', cpf: '', brand_id: '', commission_rate: 5.0 });
        }}>
          {showForm ? 'Cancelar' : '+ Novo'}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleSubmit}>
          <div className="card-title">{editingId ? 'Editar' : 'Novo'} Representante</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div className="form-group">
              <label>Nome *</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" className="form-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Senha {editingId ? '(deixe vazio para manter)' : '*'}</label>
              <input type="password" className="form-input" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required={!editingId} />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input className="form-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>CPF</label>
              <input className="form-input" value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Marca</label>
              <select className="form-input" value={form.brand_id} onChange={(e) => setForm((f) => ({ ...f, brand_id: e.target.value }))}>
                <option value="">Sem marca</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Comissao (%)</label>
              <input type="number" className="form-input" value={form.commission_rate}
                onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))}
                min="0" max="100" step="0.5" />
            </div>
          </div>
          <button type="submit" className="btn btn-success" style={{ marginTop: 8 }}>
            {editingId ? 'Atualizar' : 'Criar'} Representante
          </button>
        </form>
      )}

      {reps.map((rep) => (
        <div key={rep.id} className="card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{rep.name}</p>
                {!rep.active && <span className="badge badge-cancelled">Inativo</span>}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-light)' }}>{rep.email} | {rep.phone || '-'}</p>
              <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                {rep.brand_name || 'Sem marca'} | Comissao: {rep.commission_rate}%
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <span style={{ fontSize: 12 }}><strong>{rep.total_orders}</strong> pedidos</span>
                <span style={{ fontSize: 12, color: 'var(--success)' }}><strong>{formatCurrency(rep.total_sales)}</strong> vendas</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-outline btn-sm" onClick={() => handleEdit(rep)}>Editar</button>
              <button className={`btn btn-sm ${rep.active ? 'btn-danger' : 'btn-success'}`}
                onClick={() => handleToggleActive(rep)}>
                {rep.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
