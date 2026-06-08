import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const widths = { sm: '400px', md: '520px', lg: '680px', xl: '860px' };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div
                style={{ ...styles.modal, maxWidth: widths[size] }}
                onClick={(e) => e.stopPropagation()}
                className="animate-fade"
            >
                <div style={styles.header}>
                    <h3 style={styles.title}>{title}</h3>
                    <button onClick={onClose} style={styles.closeBtn} className="hover-bg">
                        <X size={20} />
                    </button>
                </div>
                <div style={styles.body}>{children}</div>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 9999,
        padding: 'clamp(1rem, 7vh, 4rem) 2rem 2rem',
        overflowY: 'auto',
    },
    modal: {
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--primary)',
        borderRadius: '1.5rem',
        boxShadow: 'var(--shadow-xl)',
        width: '100%',
        maxHeight: 'calc(100vh - clamp(2rem, 9vh, 5rem))',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.75rem 2rem',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
    },
    title: {
        margin: 0, fontSize: '1rem', fontWeight: '800',
        color: 'var(--text-main)',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    closeBtn: {
        background: 'none', border: 'none',
        cursor: 'pointer', color: 'var(--text-muted)',
        padding: '0.4rem', borderRadius: 'var(--radius-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'var(--transition-fast)',
    },
    body: {
        padding: '1.5rem',
        overflowY: 'auto',
        flex: 1,
    },
};

export default Modal;
