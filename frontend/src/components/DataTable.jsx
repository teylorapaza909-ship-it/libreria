import React, { useState } from 'react';
import { Search, Edit2, Trash2 } from 'lucide-react';

const DataTable = ({ columns, data, onEdit, onDelete, searchPlaceholder = "Buscar registros..." }) => {
    const [search, setSearch] = useState('');

    const filteredData = data.filter(row => 
        Object.values(row).some(val => String(val).toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="card animate-fade" style={styles.container}>
            <div style={styles.header}>
                <div style={styles.searchBox}>
                    <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px' }} />
                    <input 
                        type="text" 
                        placeholder={searchPlaceholder} 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="form-control hover-focus-transition"
                        style={{ paddingLeft: '3rem', maxWidth: '400px', backgroundColor: 'var(--bg-color)', border: '1px solid transparent' }}
                    />
                </div>
            </div>
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead style={styles.thead}>
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} style={styles.th}>{col.label}</th>
                            ))}
                            {(onEdit || onDelete) && <th style={{...styles.th, textAlign: 'right', width: '100px'}}>Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-full)' }}>
                                            <Search size={32} opacity={0.5} />
                                        </div>
                                        <span style={{ fontWeight: 500 }}>No se encontraron resultados</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((row, idx) => (
                                <tr key={row.id || idx} style={styles.tr} className="table-row-hover">
                                    {columns.map(col => (
                                        <td key={col.key} style={styles.td}>
                                            {typeof col.render === 'function' ? col.render(row) : row[col.key]}
                                        </td>
                                    ))}
                                    {(onEdit || onDelete) && (
                                        <td style={{...styles.td, textAlign: 'right'}}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                                {onEdit && (
                                                    <button onClick={() => onEdit(row)} style={{...styles.btnAction}} className="btn-edit" title="Editar">
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button onClick={() => onDelete(row)} style={{...styles.btnAction}} className="btn-delete" title="Eliminar">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                .table-row-hover:hover {
                    background-color: var(--surface-hover) !important;
                }
                .hover-focus-transition:focus {
                    background-color: var(--surface) !important;
                    border-color: var(--primary) !important;
                }
                .btn-edit, .btn-delete {
                    color: var(--text-muted);
                }
                .btn-edit:hover {
                    color: var(--primary);
                    background-color: var(--primary-light);
                }
                .btn-delete:hover {
                    color: var(--danger);
                    background-color: var(--danger-light);
                }
            `}} />
        </div>
    );
};

const styles = {
    container: {
        padding: 0,
        overflow: 'hidden',
        marginTop: '1.5rem',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-md)'
    },
    header: {
        padding: '1.5rem 2rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'transparent'
    },
    searchBox: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        maxWidth: '450px'
    },
    tableContainer: {
        overflowX: 'auto',
        width: '100%',
        maxHeight: '65vh'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left'
    },
    thead: {
        backgroundColor: 'var(--bg-color)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(5px)'
    },
    th: {
        padding: '1.25rem 1.5rem',
        fontWeight: '800',
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: 'var(--text-muted)',
        borderBottom: '1px solid var(--border-color)',
        borderTop: 'none',
        whiteSpace: 'nowrap'
    },
    tr: {
        borderBottom: '1px solid var(--border-color)',
        transition: 'all 0.3s ease'
    },
    td: {
        padding: '1.25rem 1.5rem',
        verticalAlign: 'middle',
        fontSize: '0.875rem',
        color: 'var(--text-main)',
        whiteSpace: 'nowrap'
    },
    btnAction: {
        background: 'none',
        border: '1px solid transparent',
        cursor: 'pointer',
        padding: '0.4rem',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
    }
};

export default DataTable;
