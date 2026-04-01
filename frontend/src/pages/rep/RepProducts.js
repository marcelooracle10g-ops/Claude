import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import Loading from '../../components/Loading';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function RepProducts() {
  const [products, setProducts] = useState([]);
  const [priceTables, setPriceTables] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { addItem, selectedPriceTable, setSelectedPriceTable } = useCart();
  const { toast, showToast } = useToast();

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getProducts({ search, page: 1 });
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Erro ao carregar produtos', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    api.getPriceTables()
      .then((data) => setPriceTables(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleAddToCart = (product) => {
    addItem({
      bling_product_id: String(product.id),
      product_name: product.nome || product.name,
      product_code: product.codigo || product.code || '',
      unit_price: product.preco || product.price || 0,
    });
    showToast(`${product.nome || product.name} adicionado ao carrinho`, 'success');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadProducts();
  };

  return (
    <div>
      <Toast toast={toast} />
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Produtos</h2>

      <div className="form-group">
        <label>Tabela de Preco</label>
        <select
          className="form-input"
          value={selectedPriceTable?.id || ''}
          onChange={(e) => {
            const table = priceTables.find((t) => String(t.id) === e.target.value);
            setSelectedPriceTable(table || null);
          }}
        >
          <option value="">Preco padrao</option>
          {priceTables.map((t) => (
            <option key={t.id} value={t.id}>{t.nome || t.name}</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSearch} className="search-box">
        <input
          type="text"
          className="form-input"
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm">Buscar</button>
      </form>

      {loading ? (
        <Loading />
      ) : products.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum produto encontrado</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Configure a integracao com o Bling para carregar os produtos</p>
        </div>
      ) : (
        products.map((product) => (
          <div key={product.id} className="list-item" onClick={() => handleAddToCart(product)}>
            <div className="list-item-info">
              <h3>{product.nome || product.name}</h3>
              <p>Cod: {product.codigo || product.code || '-'}</p>
              <p style={{ color: 'var(--success)', fontWeight: 600 }}>
                R$ {(product.preco || product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button className="btn btn-accent btn-sm" onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}>
              + Adicionar
            </button>
          </div>
        ))
      )}
    </div>
  );
}
