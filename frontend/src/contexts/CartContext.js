import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedPriceTable, setSelectedPriceTable] = useState(null);
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);

  const addItem = (product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.bling_product_id === product.bling_product_id);
      if (existing) {
        return prev.map((i) =>
          i.bling_product_id === product.bling_product_id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.bling_product_id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.bling_product_id === productId ? { ...i, quantity } : i
      )
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const total = subtotal - discount;

  const clearCart = () => {
    setItems([]);
    setSelectedCustomer(null);
    setSelectedPriceTable(null);
    setNotes('');
    setDiscount(0);
  };

  return (
    <CartContext.Provider
      value={{
        items, addItem, removeItem, updateQuantity,
        selectedBrand, setSelectedBrand,
        selectedCustomer, setSelectedCustomer,
        selectedPriceTable, setSelectedPriceTable,
        notes, setNotes,
        discount, setDiscount,
        subtotal, total,
        clearCart,
        itemCount: items.length,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
