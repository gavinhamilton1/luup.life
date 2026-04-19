import React from 'react';
import { useStore } from '../lib/store.js';

export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return <div className="toast fade-in">{toast}</div>;
}
