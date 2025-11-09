import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Create the Cart Context
const CartContext = createContext();

// Custom hook to use the cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Cart Provider Component
export const CartProvider = ({ children }) => {
  // Initialize from localStorage if present so selections persist across reloads
  const [selectedDrills, setSelectedDrills] = useState(() => {
    try {
      const raw = localStorage.getItem('selectedDrills');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Failed to read selectedDrills from localStorage', e);
      return [];
    }
  });

  // Persist selected drills to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('selectedDrills', JSON.stringify(selectedDrills));
    } catch (e) {
      console.warn('Failed to write selectedDrills to localStorage', e);
    }
  }, [selectedDrills]);

  // Add drill to cart (avoid duplicates)
  const addDrill = useCallback((drill) => {
    setSelectedDrills(prev => {
      const exists = prev.find(d => d.id === drill.id);
      if (exists) return prev; // Already in cart
      return [...prev, drill];
    });
  }, []);

  // Remove drill from cart
  const removeDrill = useCallback((drillId) => {
    setSelectedDrills(prev => prev.filter(d => d.id !== drillId));
  }, []);

  // Check if drill is in cart
  const isInCart = useCallback((drillId) => {
    return selectedDrills.some(d => d.id === drillId);
  }, [selectedDrills]);

  // Reorder drills (for drag and drop)
  const reorderDrills = useCallback((startIndex, endIndex) => {
    setSelectedDrills(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  // Clear all drills
  const clearCart = useCallback(() => {
    setSelectedDrills([]);
  }, []);

  // Get total duration
  const getTotalDuration = useCallback(() => {
    return selectedDrills.reduce((total, drill) => total + (drill.duration || 0), 0);
  }, [selectedDrills]);

  const value = {
    selectedDrills,
    addDrill,
    removeDrill,
    isInCart,
    reorderDrills,
    clearCart,
    getTotalDuration,
    count: selectedDrills.length
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};