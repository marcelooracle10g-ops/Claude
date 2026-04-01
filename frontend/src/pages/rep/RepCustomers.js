import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import Loading from '../../components/Loading';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function RepCustomers() {
  const [localCustomers, setLocalCustomers] = useState([]);
  const [blingCustomers, setBlingCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('local');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', trade_name: '', cnpj_cpf: '', email: '', phone: '', address: '', city: '', state: '', zip_code: '', neighborhood: '' });
  const { setSelectedCustomer } = useCart();
  const { toast, showToast } = useToast();

  useEffect(() => {
    loadLocalCustomers();
  }, []);

  const loadLocalCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers({ search });
      setLocalCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Erro ao carregar clientes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const searchBling = async () => {
    try {
      setLoading(true);
      const data = await api.searchBlingCustomers({ search });
      setBlingCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Erro ao buscar no Bling', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (tab === 'local') loadLocalCustomers();
    else searchBling();
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    showToast(`Cliente ${customer.name || customer.nome} selecionado`, 'success');
  };

  const importFromBling = async (blingCustomer) => {
    try {
      const imported = await api.importCustomerFromBling(blingCustomer.id);
      setSelectedCustomer(imported);
      showToast('Cliente importado e selecionado', 'success');
      loadLocalCustomers();
    } catch (err) {
      showToast('Erro ao importar cliente', 'error');
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const customer = await api.createCustomer(form);
      setSelectedCustomer(customer);
      showToast('Cliente criado e selecionado', 'success');
      setShowForm(false);
      setForm({ name: '', trade_name: '', cnpj_cpf: '', email: '', phone: '', address: '', city: '', state: '', zip_code: '', neighborhood: '' });
      loadLocalCustomers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      <Toast toast={toast} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18 }}>Clientes</h2>
        <button className="btn btn-accent btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Novo'}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleCreateCustomer}>
          <div className="card-title">Novo Cliente</div>
          {[
            { key: 'name', label: 'Nome *', required: true },
            { key: 'trade_name', label: 'Nome Fantasia' },
            { key: 'cnpj_cpf', label: 'CNPJ/CPF' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Telefone', type: 'tel' },
            { key: 'address', label: 'Endereco' },
            { key: 'neighborhood', label: 'Bairro' },
            { key: 'city', label: 'Cidade' },
            { key: 'state', label: 'Estado' },
            { key: 'zip_code', label: 'CEP' },
          ].map(({ key, label, type, required }) => (
            <div className="form-group" key={key}>
              <label>{label}</label>
              <input
                type={type || 'text'}
                className="form-input"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required={required}
              />
            </div>
          ))}
          <button type="submit" className="btn btn-success">Salvar Cliente</button>
        </form>
      )}

      <div className="tabs">
        <button className={`tab ${tab === 'local' ? 'active' : ''}`} onClick={() => setTab('local')}>Locais</button>
        <button className={`tab ${tab === 'bling' ? 'active' : ''}`} onClick={() => setTab('bling')}>Buscar no Bling</button>
      </div>

      <form onSubmit={handleSearch} className="search-box">
        <input
          type="text"
          className="form-input"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm">Buscar</button>
      </form>

      {loading ? (
        <Loading />
      ) : tab === 'local' ? (
        localCustomers.length === 0 ? (
          <div className="empty-state"><p>Nenhum cliente encontrado</p></div>
        ) : (
          localCustomers.map((c) => (
            <div key={c.id} className="list-item" onClick={() => selectCustomer(c)}>
              <div className="list-item-info">
                <h3>{c.name}</h3>
                <p>{c.cnpj_cpf || 'Sem documento'} - {c.city || ''}/{c.state || ''}</p>
                {c.synced_with_bling ? (
                  <span style={{ fontSize: 10, color: 'var(--success)' }}>Sincronizado com Bling</span>
                ) : (
                  <span style={{ fontSize: 10, color: 'var(--warning)' }}>Pendente sincronizacao</span>
                )}
              </div>
              <span style={{ fontSize: 12, color: 'var(--info)' }}>Selecionar</span>
            </div>
          ))
        )
      ) : (
        blingCustomers.length === 0 ? (
          <div className="empty-state"><p>Busque um cliente no Bling</p></div>
        ) : (
          blingCustomers.map((c) => (
            <div key={c.id} className="list-item" onClick={() => importFromBling(c)}>
              <div className="list-item-info">
                <h3>{c.nome || c.name}</h3>
                <p>{c.numeroDocumento || ''}</p>
              </div>
              <button className="btn btn-accent btn-sm" onClick={(e) => { e.stopPropagation(); importFromBling(c); }}>
                Importar
              </button>
            </div>
          ))
        )
      )}
    </div>
  );
}
