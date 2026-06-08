import React, { useRef } from 'react';
import { Printer, XCircle } from 'lucide-react';

/* eslint-disable react-refresh/only-export-components */

/* ─── Constantes de papel ─────────────────────────────────────────────────── */
const PAPER_MM   = 58;          // Formato compacto similar a ticket térmico angosto
const FONT_SIZE  = '11px';
const FONT_MONO  = '"Courier New", Courier, monospace';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const money = (value) => `S/ ${(Number(value) || 0).toFixed(2)}`;

const formatDate = (value) => {
    if (value) return value;
    return new Date().toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const getUnitPrice = (item) =>
    Number(item?.tipo_venta === 'caja' ? item?.precio_caja : item?.precio_unidad ?? item?.precio) || 0;

const getComputedTotal = (items, total) => {
    const n = Number(total);
    if (!Number.isNaN(n) && n > 0) return n;
    return items.reduce((sum, item) => sum + (Number(item?.cantidad) || 0) * getUnitPrice(item), 0);
};

/* ─── CSS de impresión ────────────────────────────────────────────────────── */
// Se inyecta UNA SOLA VEZ en <head> (se reutiliza si ya existe).
const PRINT_STYLE_ID = 'thermal-print-style';

function injectPrintStyles() {
    if (document.getElementById(PRINT_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = PRINT_STYLE_ID;
    style.textContent = `
        @media print {
            /* ── Tamaño de hoja ── */
            @page {
                size: ${PAPER_MM}mm auto;
                margin: 0mm;
            }

            /* ── Ocultar TODO el contenido normal de la página ── */
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                background: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            body {
                display: flex !important;
                justify-content: center !important;
                align-items: flex-start !important;
            }

            /* Ocultar todo */
            body > *:not(#thermal-print-root) {
                display: none !important;
            }

            /* ── Contenedor de impresión ── */
            #thermal-print-root {
                display: block !important;
                visibility: visible !important;
                position: static !important;
                width: ${PAPER_MM}mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
                background: #fff !important;
                font-family: ${FONT_MONO} !important;
                font-size: ${FONT_SIZE} !important;
                font-weight: 600 !important;
                line-height: 1.3 !important;
                color: #000 !important;
                box-shadow: none !important;
                border: none !important;
            }

            #thermal-print-root * {
                visibility: visible !important;
                box-shadow: none !important;
            }

            /* ── Tabla de productos ── */
            #thermal-print-root table {
                width: 100% !important;
                table-layout: auto !important;
                border-collapse: collapse !important;
            }
        }
    `;
    document.head.appendChild(style);
}

/* ─── Función principal de impresión ─────────────────────────────────────── */
function printTicket(ticketHTML) {
    injectPrintStyles();

    // Crear / reutilizar el nodo raíz de impresión
    let root = document.getElementById('thermal-print-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'thermal-print-root';
        document.body.appendChild(root);
    }

    root.innerHTML = ticketHTML;

    // Pequeño delay para que el DOM se actualice antes de imprimir
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            window.print();
            // Limpiar el nodo después de imprimir
            setTimeout(() => { root.innerHTML = ''; }, 500);
        });
    });
}

/* ─── buildTicketHTMLFromData (función pura exportable) ───────────────────── */
// Recibe { cart, total, meta } y devuelve el HTML listo para imprimir.
// Misma lógica que el buildTicketHTML interno del componente.
export function buildTicketHTMLFromData({ cart = [], total = 0, meta = {} }) {
    const items         = Array.isArray(cart) ? cart : [];
    const computedTotal = getComputedTotal(items, total);
    const issueDate     = formatDate(meta.fecha);
    const paymentMethod = meta.metodoPago  || 'Efectivo';
    const documentNumber= meta.documento   || '20123456789';
    const businessName  = meta.negocio     || 'LIBRERÍA BAZAR EL EDUCANDO';
    const address       = meta.direccion   || 'Av. Principal 123';
    const phone         = meta.contacto    || '999 999 999';
    const email         = meta.correo      || 'micorreo@hotmail.com';
    const customer      = meta.cliente     || 'General';
    const ticketNumber  = meta.ticket      || 'T001-00000001';

    const rowsHTML = items.map((item) => {
        const quantity  = Number(item?.cantidad) || 0;
        const unitPrice = getUnitPrice(item);
        const rowTotal  = quantity * unitPrice;
        const tipoLabel = item?.tipo_venta === 'caja'
            ? `Caja x${item?.cantidad_por_caja || 1}`
            : 'Unidad';
        return `
            <tr>
                <td style="vertical-align:top;padding:5px 6px 5px 0;word-break:break-word;font-size:14px;">
                    ${String(item?.nombre || 'producto').toLowerCase()}
                    ${item?.tipo_venta ? `<br/><span style="font-size:9px;font-weight:600;color:#555;">${tipoLabel}</span>` : ''}
                </td>
                <td style="text-align:center;vertical-align:top;padding:4px 2px;font-size:11px;font-weight:600;">${quantity}</td>
                <td style="text-align:right;vertical-align:top;padding:4px 0 4px 2px;white-space:nowrap;font-size:11px;font-weight:600;">${money(unitPrice)}</td>
                <td style="text-align:right;vertical-align:top;padding:4px 0 4px 2px;white-space:nowrap;font-size:11px;font-weight:600;">${money(rowTotal)}</td>
            </tr>`;
    }).join('');

    const emptyRow = items.length === 0
        ? `<tr><td colspan="4" style="text-align:center;padding:8px 0;color:#555;">Sin productos.</td></tr>`
        : '';

    const HR = `<hr style="border:none;border-top:1px dashed #000;margin:8px 0;"/>`;

    return `
        <div style="
            width:100%;
            font-family:${FONT_MONO};
            font-size:${FONT_SIZE};
            line-height:1.25;
            color:#000;
            background:#fff;
            padding:3mm 3mm 4mm;
            box-sizing:border-box;
        ">
            <!-- CABECERA -->
            <div style="text-align:center;margin-bottom:6px;">
                <img src="/img/logo_libreria.jpg" alt="Logo"
                    style="max-width:72px;height:auto;display:block;margin:0 auto 4px;" />
                <p style="margin:2px 0;font-weight:700;font-size:13px;">${businessName}</p>
                <p style="margin:2px 0;font-size:11px;font-weight:600;">N° Doc: ${documentNumber}</p>
                <p style="margin:2px 0;font-size:11px;font-weight:600;">Dir: ${address}</p>
                <p style="margin:2px 0;font-size:11px;font-weight:600;">Tel: ${phone}</p>
                <p style="margin:2px 0;font-size:10px;font-weight:600;">${email}</p>
            </div>

            ${HR}
            <p style="margin:3px 0;font-size:11px;font-weight:600;">Cliente: <strong>${customer}</strong></p>
            ${HR}

            <p style="text-align:center;font-size:13px;font-weight:700;letter-spacing:1px;margin:5px 0;">NOTA DE VENTA</p>
            <p style="margin:2px 0;font-size:11px;font-weight:600;">N°: ${ticketNumber}</p>
            <p style="margin:2px 0;font-size:11px;font-weight:600;">Fecha: ${issueDate}</p>
            <p style="margin:2px 0;font-size:11px;font-weight:600;">Pago: ${paymentMethod}</p>
            ${HR}

            <!-- TABLA DE PRODUCTOS -->
            <table style="width:100%;border-collapse:collapse;table-layout:auto;">
                <thead>
                    <tr style="border-bottom:1px solid #000;">
                        <th style="text-align:left;padding-bottom:4px;font-size:11px;font-weight:700;">Producto</th>
                        <th style="width:1%;white-space:nowrap;text-align:center;padding:0 4px 4px 4px;font-size:11px;font-weight:700;">Cant</th>
                        <th style="width:1%;white-space:nowrap;text-align:right;padding:0 4px 4px 4px;font-size:11px;font-weight:700;">Precio</th>
                        <th style="width:1%;white-space:nowrap;text-align:right;padding:0 0 4px 4px;font-size:11px;font-weight:700;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                    ${emptyRow}
                </tbody>
            </table>

            ${HR}

            <!-- TOTAL -->
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin:6px 0;">
                <span>TOTAL A PAGAR</span>
                <span>${money(computedTotal)}</span>
            </div>

            ${HR}

            <!-- PIE -->
            <div style="text-align:center;margin-top:10px;">
                <p style="margin:2px 0;font-size:11px;font-weight:600;">¡Gracias por su compra!</p>
                <p style="margin:2px 0;font-size:9px;font-weight:600;">Comprobante generado automáticamente.</p>
            </div>
        </div>`;
}

export { printTicket };

/* ─── Componente ──────────────────────────────────────────────────────────── */
const TicketModal = ({ isOpen, onClose, cart = [], total = 0, meta = {} }) => {
    const ticketRef = useRef(null);

    if (!isOpen) return null;

    const items          = Array.isArray(cart) ? cart : [];
    const computedTotal  = getComputedTotal(items, total);
    const issueDate      = formatDate(meta.fecha);
    const paymentMethod  = meta.metodoPago  || 'Efectivo';
    const documentNumber = meta.documento   || '20123456789';
    const businessName   = meta.negocio     || 'LIBRERÍA BAZAR EL EDUCANDO';
    const address        = meta.direccion   || 'Av. Principal 123';
    const phone          = meta.contacto    || '999 999 999';
    const email          = meta.correo      || 'micorreo@hotmail.com';
    const customer       = meta.cliente     || 'General';
    const ticketNumber   = meta.ticket      || 'T001-00000001';

    /* ── Generar HTML del ticket para impresión ── */
    const buildTicketHTML = () => {
        const rowsHTML = items.map((item) => {
            const quantity  = Number(item?.cantidad) || 0;
            const unitPrice = getUnitPrice(item);
            const rowTotal  = quantity * unitPrice;
            const tipoLabel = item?.tipo_venta === 'caja'
                ? `Caja x${item?.cantidad_por_caja || 1}`
                : 'Unidad';
            return `
                <tr>
                    <td style="vertical-align:top;padding:5px 6px 5px 0;word-break:break-word;font-size:14px;">
                        ${String(item?.nombre || 'producto').toLowerCase()}
                        ${item?.tipo_venta ? `<br/><span style="font-size:9px;font-weight:600;color:#555;">${tipoLabel}</span>` : ''}
                    </td>
                    <td style="text-align:center;vertical-align:top;padding:4px 2px;font-size:11px;font-weight:600;">${quantity}</td>
                    <td style="text-align:right;vertical-align:top;padding:4px 0 4px 2px;white-space:nowrap;font-size:11px;font-weight:600;">${money(unitPrice)}</td>
                    <td style="text-align:right;vertical-align:top;padding:4px 0 4px 2px;white-space:nowrap;font-size:11px;font-weight:600;">${money(rowTotal)}</td>
                </tr>`;
        }).join('');

        const emptyRow = items.length === 0
            ? `<tr><td colspan="4" style="text-align:center;padding:8px 0;color:#555;">Sin productos.</td></tr>`
            : '';

        const HR = `<hr style="border:none;border-top:1px dashed #000;margin:8px 0;"/>`;

        return `
            <div style="
                width:100%;
                font-family:${FONT_MONO};
                font-size:${FONT_SIZE};
                line-height:1.25;
                color:#000;
                background:#fff;
                padding:3mm 3mm 4mm;
                box-sizing:border-box;
            ">
                <!-- CABECERA -->
                <div style="text-align:center;margin-bottom:6px;">
                    <img src="/img/logo_libreria.jpg" alt="Logo"
                        style="max-width:72px;height:auto;display:block;margin:0 auto 4px;" />
                    <p style="margin:2px 0;font-weight:700;font-size:13px;">${businessName}</p>
                    <p style="margin:2px 0;font-size:11px;font-weight:600;">N° Doc: ${documentNumber}</p>
                    <p style="margin:2px 0;font-size:11px;font-weight:600;">Dir: ${address}</p>
                    <p style="margin:2px 0;font-size:11px;font-weight:600;">Tel: ${phone}</p>
                    <p style="margin:2px 0;font-size:10px;font-weight:600;">${email}</p>
                </div>

                ${HR}
                <p style="margin:3px 0;font-size:11px;font-weight:600;">Cliente: <strong>${customer}</strong></p>
                ${HR}

                <p style="text-align:center;font-size:13px;font-weight:700;letter-spacing:1px;margin:5px 0;">NOTA DE VENTA</p>
                <p style="margin:2px 0;font-size:11px;font-weight:600;">N°: ${ticketNumber}</p>
                <p style="margin:2px 0;font-size:11px;font-weight:600;">Fecha: ${issueDate}</p>
                <p style="margin:2px 0;font-size:11px;font-weight:600;">Pago: ${paymentMethod}</p>
                ${HR}

                <!-- TABLA DE PRODUCTOS -->
                <table style="width:100%;border-collapse:collapse;table-layout:auto;">
                    <thead>
                        <tr style="border-bottom:1px solid #000;">
                            <th style="text-align:left;padding-bottom:4px;font-size:11px;font-weight:700;">Producto</th>
                            <th style="width:1%;white-space:nowrap;text-align:center;padding:0 4px 4px 4px;font-size:11px;font-weight:700;">Cant</th>
                            <th style="width:1%;white-space:nowrap;text-align:right;padding:0 4px 4px 4px;font-size:11px;font-weight:700;">Precio</th>
                            <th style="width:1%;white-space:nowrap;text-align:right;padding:0 0 4px 4px;font-size:11px;font-weight:700;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                        ${emptyRow}
                    </tbody>
                </table>

                ${HR}

                <!-- TOTAL -->
                <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin:6px 0;">
                    <span>TOTAL A PAGAR</span>
                    <span>${money(computedTotal)}</span>
                </div>

                ${HR}

                <!-- PIE -->
                <div style="text-align:center;margin-top:10px;">
                    <p style="margin:2px 0;font-size:11px;font-weight:600;">¡Gracias por su compra!</p>
                    <p style="margin:2px 0;font-size:9px;font-weight:600;">Comprobante generado automáticamente.</p>
                </div>
            </div>`;
    };

    const handlePrint = () => {
        printTicket(buildTicketHTML());
    };

    /* ── Render del modal (solo visual, no participa en impresión) ── */
    return (
        <div style={S.overlay}>
            <div style={S.modal} className="animate-fade">

                {/* ── Header ── */}
                <div style={S.modalHeader}>
                    <h2 style={S.modalTitle}>
                        <span style={S.checkIcon}>✓</span>
                        Venta Exitosa
                    </h2>
                    <button style={S.closeBtn} onClick={onClose} title="Cerrar">
                        <XCircle size={24} />
                    </button>
                </div>

                {/* ── Body: vista previa del ticket ── */}
                <div style={S.modalBody}>
                    <p style={S.modalText}>
                        Vista previa del comprobante. Haz clic en <strong>Imprimir</strong> para imprimir.
                    </p>

                    {/* Vista previa simulando papel térmico */}
                    <div style={S.paperShadow}>
                        <div ref={ticketRef} style={S.ticketPreview}>

                            {/* Cabecera */}
                            <div style={S.center}>
                                <img
                                    src="/img/logo_libreria.jpg"
                                    alt="Logo"
                                    style={S.logo}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <p style={{ ...S.tLine, fontWeight: 'bold', fontSize: '13px' }}>{businessName}</p>
                                <p style={S.tLine}>N° Doc: {documentNumber}</p>
                                <p style={S.tLine}>Dir: {address}</p>
                                <p style={S.tLine}>Tel: {phone}</p>
                                <p style={S.tLine}>{email}</p>
                            </div>

                            <hr style={S.hr} />
                            <p style={S.tLine}>Cliente: <strong>{customer}</strong></p>
                            <hr style={S.hr} />

                            <p style={{ ...S.center, ...S.tLine, fontWeight: 'bold', fontSize: '15px', letterSpacing: '3px' }}>TICKET</p>
                            <p style={S.tLine}>N°: {ticketNumber}</p>
                            <p style={S.tLine}>Fecha: {issueDate}</p>
                            <p style={S.tLine}>Pago: {paymentMethod}</p>
                            <hr style={S.hr} />

                            {/* Tabla */}
                            <table style={S.table}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                        <th style={{ ...S.thBase, textAlign: 'left' }}>Producto</th>
                                        <th style={{ ...S.thBase, width: '1%', whiteSpace: 'nowrap', textAlign: 'center', paddingLeft: '4px', paddingRight: '4px' }}>Cant</th>
                                        <th style={{ ...S.thBase, width: '1%', whiteSpace: 'nowrap', textAlign: 'right', paddingLeft: '4px', paddingRight: '4px' }}>Precio</th>
                                        <th style={{ ...S.thBase, width: '1%', whiteSpace: 'nowrap', textAlign: 'right', paddingLeft: '4px' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => {
                                        const quantity  = Number(item?.cantidad) || 0;
                                        const unitPrice = getUnitPrice(item);
                                        return (
                                            <tr key={`${item?.id || 'item'}-${idx}`}>
                                                <td style={S.tdProduct}>
                                                    <div>{String(item?.nombre || 'producto').toLowerCase()}</div>
                                                    {item?.tipo_venta && (
                                                        <div style={S.metaLabel}>
                                                            {item.tipo_venta === 'caja'
                                                                ? `Caja x${item?.cantidad_por_caja || 1}`
                                                                : 'Unidad'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={S.tdCenter}>{quantity}</td>
                                                <td style={S.tdRight}>{money(unitPrice)}</td>
                                                <td style={S.tdRight}>{money(quantity * unitPrice)}</td>
                                            </tr>
                                        );
                                    })}
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '8px 0', color: '#888' }}>
                                                Sin productos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            <hr style={S.hr} />

                            {/* Total */}
                            <div style={S.totalRow}>
                                <span>TOTAL A PAGAR</span>
                                <span style={{ fontWeight: 'bold' }}>{money(computedTotal)}</span>
                            </div>

                            <hr style={S.hr} />

                            {/* Pie */}
                            <div style={{ ...S.center, marginTop: '12px' }}>
                                <p style={S.tLine}>¡Gracias por su compra!</p>
                                <p style={{ ...S.tLine, fontSize: '10px', color: '#555' }}>
                                    Comprobante generado automáticamente.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div style={S.modalFooter}>
                    <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
                        Cerrar y Nueva Venta
                    </button>
                    <button className="btn btn-primary" onClick={handlePrint} style={{ flex: 1 }}>
                        <Printer size={18} style={{ marginRight: '6px' }} />
                        Imprimir Recibo
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Estilos del modal (pantalla) ───────────────────────────────────────── */
const S = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15,23,42,0.78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(6px)'
    },
    modal: {
        width: '480px', maxWidth: '96vw', maxHeight: '92vh',
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.55)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
    },
    modalHeader: {
        padding: '1.4rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'var(--bg-color)'
    },
    modalTitle: {
        margin: 0, color: 'var(--success)', fontSize: '1.2rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem'
    },
    checkIcon: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '24px', height: '24px',
        background: 'var(--success)', color: '#fff',
        borderRadius: '50%', fontSize: '14px'
    },
    closeBtn: {
        background: 'none', border: 'none',
        color: 'var(--text-muted)', cursor: 'pointer',
        display: 'flex', transition: 'color 0.2s'
    },
    modalBody: { padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 },
    modalText: {
        textAlign: 'center', color: 'var(--text-muted)',
        marginBottom: '1.2rem', fontSize: '0.88rem'
    },
    /* Simulación del papel térmico en pantalla */
    paperShadow: {
        display: 'flex', justifyContent: 'center',
        background: '#d0d0d0', borderRadius: '6px', padding: '14px'
    },
    ticketPreview: {
        width: `${PAPER_MM}mm`,
        maxWidth: '100%',
        background: '#fff',
        color: '#000',
        fontFamily: FONT_MONO,
        fontSize: FONT_SIZE,
        fontWeight: 600,
        lineHeight: 1.25,
        padding: '10px 10px 12px',
        boxSizing: 'border-box',
        boxShadow: '0 4px 18px rgba(0,0,0,0.2)'
    },
    center: { textAlign: 'center' },
    logo: { width: '72px', height: 'auto', display: 'block', margin: '0 auto 4px', objectFit: 'contain' },
    tLine: { margin: '2px 0', wordBreak: 'break-word' },
    hr: { border: 'none', borderTop: '1px dashed #000', margin: '6px 0' },
    table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'auto', margin: '6px 0' },
    thBase: { paddingBottom: '4px', fontSize: '11px', fontWeight: 700 },
    tdProduct: { verticalAlign: 'top', padding: '4px 4px 4px 0', wordBreak: 'break-word' },
    tdCenter:  { textAlign: 'center', verticalAlign: 'top', padding: '4px 4px', fontWeight: 600, whiteSpace: 'nowrap' },
    tdRight:   { textAlign: 'right',  verticalAlign: 'top', padding: '4px 4px', whiteSpace: 'nowrap', fontWeight: 600 },
    metaLabel: { fontSize: '9px', color: '#666', marginTop: '2px', fontWeight: 600 },
    totalRow:  { display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', margin: '6px 0' },
    modalFooter: {
        padding: '1.1rem 1.5rem',
        borderTop: '1px solid var(--border-color)',
        display: 'flex', gap: '1rem',
        backgroundColor: 'var(--bg-color)'
    }
};

export default TicketModal;
