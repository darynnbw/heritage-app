import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface CustomConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CustomConfirmModal: React.FC<CustomConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal-container" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center' }}>
            <AlertTriangle size={22} />
          </div>
          <h2 id="confirm-title" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--color-foreground)', fontWeight: 700, letterSpacing: '0.03em' }}>
            {title}
          </h2>
        </div>
        
        <p style={{ fontSize: '0.88rem', color: 'var(--color-muted-foreground)', lineHeight: '1.5', fontFamily: 'var(--font-body)' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: '4px' }}>
            {cancelLabel}
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: '4px' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
