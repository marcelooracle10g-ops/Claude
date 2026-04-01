import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function RepCart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    items, removeItem, updateQuantity,
    selectedBrand, setSelectedBrand,
    selectedCustomer, setSelectedCustomer,
    notes, setNotes, discount, setDiscount,
    subtotal, total, clearCart,
    selectedPriceTable,
  } = useCart();
  const { toast, showToast } = useToast();
  const [brands, setBrands] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [sendToBling, setSendToBling] = useState(true);

  useEffect(() => {
    api.getBrands()
      .then((data) => {
        setBrands(data);
        if (!selectedBrand && user?.brand_id) {
          const userBrand = data.find((b) => b.id === user.brand_id);
          if (userBrand) setSelectedBrand(userBrand);
        }
      })
      .catch(() => {});
  }, [user, selectedBrand, setSelectedBrand]);

  const formatCurrency = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const handleSubmit = async () => {
    if (!selectedBrand) return showToast('Selecione uma marca', 'error');
    if (!selectedCustomer) return showToast('Selecione um cliente', 'error');
    if (items.length === 0) return showToast('Adicione produtos ao carrinho', 'error');

    setSubmitting(true);
    try {
      const order = await api.createOrder({
        brand_id: selectedBrand.id,
        customer_id: selectedCustomer.id,
        items,
        notes,
        discount,
        price_table_id: selectedPriceTable?.id,
        price_table_name: selectedPriceTable?.nome || selectedPriceTable?.name,
      });

      if (sendToBling) {
        try {
          await api.sendOrderToBling(order.id);
          showToast('Pedido criado e enviado ao Bling!', 'success');
        } catch (blingErr) {
          showToast('Pedido criado, mas erro ao enviar ao Bling: ' + blingErr.message, 'error');
        }
      } else {
        showToast('Pedido criado com sucesso!', 'success');
      }

      clearCart();
      setTimeout(() => navigate('/rep/orders'), 1500);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Toast toast={toast} />
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Carrinho</h2>

      {/* Brand Selection */}
      <div className="card">
        <div className="card-title">Marca</div>
        <div className="brand-selector">
          {brands.map((brand) => (
            <button
              key={brand.id}
              className={`brand-btn ${selectedBrand?.id === brand.id ? 'active' : ''}`}
              onClick={() => setSelectedBrand(brand)}
            >
              {brand.name}
            </button>
          ))}
        </div>
      </div>

      {/* Customer */}
      <div className="card">
        <div className="card-title">Cliente</div>
        {selectedCustomer ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600 }}>{selectedCustomer.name}</p>
              <p style={{ fontSize: 12, color: 'var(--text-light)' }}>{selectedCustomer.cnpj_cpf || 'Sem documento'}</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/rep/customers')}>Trocar</button>
          </div>
        ) : (
          <button className="btn btn-outline" onClick={() => navigate('/rep/customers')}>
            Selecionar Cliente
          </button>
        )}
      </div>

      {/* Items */}
      <div className="card">
        <div className="card-title">Itens ({items.length})</div>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <p style={{ color: 'var(--text-light)', fontSize: 13 }}>Carrinho vazio</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12, width: 'auto' }} onClick={() => navigate('/rep/products')}>
              Adicionar Produtos
            </button>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.bling_product_id} className="cart-item">
              <div className="cart-item-info">
                <p style={{ fontWeight: 600, fontSize: 13 }}>{item.product_name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  {formatCurrency(item.unit_price)} un.
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>
                  {formatCurrency(item.quantity * item.unit_price)}
                </p>
              </div>
              <div className="cart-item-actions">
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => updateQuantity(item.bling_product_id, item.quantity - 1)}>-</button>
                  <span className="qty-value">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQuantity(item.bling_product_id, item.quantity + 1)}>+</button>
                </div>
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 18 }}
                  onClick={() => removeItem(item.bling_product_id)}
                >
                  x
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notes & Discount */}
      <div className="card">
        <div className="form-group">
          <label>Observacoes</label>
          <textarea
            className="form-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observacoes do pedido..."
          />
        </div>
        <div className="form-group">
          <label>Desconto (R$)</label>
          <input
            type="number"
            className="form-input"
            value={discount}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <input
            type="checkbox"
            id="sendBling"
            checked={sendToBling}
            onChange={(e) => setSendToBling(e.target.checked)}
          />
          <label htmlFor="sendBling" style={{ fontSize: 13, cursor: 'pointer' }}>Enviar ao Bling automaticamente</label>
        </div>
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="card" style={{ background: 'var(--primary)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Desconto</span>
              <span>- {formatCurrency(discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 8 }}>
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      <button
        className="btn btn-accent"
        onClick={handleSubmit}
        disabled={submitting || items.length === 0}
        style={{ marginBottom: 16 }}
      >
        {submitting ? 'Enviando...' : 'Finalizar Pedido'}
      </button>
    </div>
  );
}
