import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

export default function RepLayout() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/rep' && location.pathname === '/rep') return true;
    if (path !== '/rep' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { path: '/rep', label: 'Inicio', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    )},
    { path: '/rep/products', label: 'Produtos', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
    )},
    { path: '/rep/cart', label: 'Carrinho', badge: itemCount, icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
    )},
    { path: '/rep/orders', label: 'Pedidos', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    )},
    { path: '/rep/commissions', label: 'Comissoes', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    )},
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1>Cosmeticos</h1>
          <span className="subtitle">{user?.name} - {user?.brand_name || 'Representante'}</span>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
          padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
        }}>
          Sair
        </button>
      </header>

      <div className="page-content">
        <Outlet />
      </div>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span style={{ position: 'relative' }}>
              {item.icon}
              {item.badge > 0 && <span className="cart-badge">{item.badge}</span>}
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
