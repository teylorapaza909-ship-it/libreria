import React, { useState } from 'react';
import { Settings, Save, Store, Phone, MapPin, Mail, DollarSign, Percent, Image } from 'lucide-react';
import toast from 'react-hot-toast';

const INIT = {
    nombre: 'Útiles POS',
    ruc: '',
    telefono: '',
    direccion: '',
    email: '',
    moneda: 'PEN',
    impuesto: '18',
};

const Field = ({ label, icon: Icon, children }) => (
    <div>
        <label style={L}>
            {Icon && <Icon size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
            {label}
        </label>
        {children}
    </div>
);

const Configuracion = () => {
    const [form, setForm]   = useState(() => {
        try { return JSON.parse(localStorage.getItem('pos_config') || 'null') || INIT; }
        catch { return INIT; }
    });
    const [saving, setSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) { toast.error('El nombre del negocio es obligatorio'); return; }
        setSaving(true);
        // Guardamos en localStorage (el backend de config se implementará más adelante)
        localStorage.setItem('pos_config', JSON.stringify(form));
        await new Promise(r => setTimeout(r, 600));
        setSaving(false);
        toast.success('Configuración guardada correctamente');
    };

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--primary-alpha)', borderRadius: 'var(--radius-lg)' }}>
                    <Settings size={24} color="var(--primary)" />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Configuración del Negocio</h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Datos comerciales que se usan en tickets, reportes y panel principal</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                    {/* Identidad del Negocio */}
                    <div className="card" style={{ padding: '1.5rem', gridColumn: '1/-1' }}>
                        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>🏪 Identidad del Negocio</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
                            <div style={{ gridColumn: '1/3' }}>
                                <Field label="Nombre del Negocio *" icon={Store}>
                                    <input className="form-control" type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Útiles y Librería El Sol" />
                                </Field>
                            </div>
                            <Field label="RUC / NIT">
                                <input className="form-control" type="text" value={form.ruc} onChange={e => set('ruc', e.target.value)} placeholder="20123456789" />
                            </Field>
                            <Field label="Teléfono" icon={Phone}>
                                <input className="form-control" type="text" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="Ej. 987654321" />
                            </Field>
                            <Field label="Correo Electrónico" icon={Mail}>
                                <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="negocio@email.com" />
                            </Field>
                            <div style={{ gridColumn: '1/-1' }}>
                                <Field label="Dirección" icon={MapPin}>
                                    <input className="form-control" type="text" value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Calle, número, ciudad..." />
                                </Field>
                            </div>
                        </div>
                    </div>

                    {/* Parámetros comerciales */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>💱 Parámetros Comerciales</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <Field label="Moneda" icon={DollarSign}>
                                <select className="form-control" value={form.moneda} onChange={e => set('moneda', e.target.value)}>
                                    <option value="PEN">🇵🇪 PEN – Sol Peruano</option>
                                    <option value="USD">🇺🇸 USD – Dólar Americano</option>
                                    <option value="EUR">🇪🇺 EUR – Euro</option>
                                </select>
                            </Field>
                            <Field label="Impuesto (%)" icon={Percent}>
                                <input className="form-control" type="number" step="0.01" min="0" max="100" value={form.impuesto} onChange={e => set('impuesto', e.target.value)} placeholder="18" />
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>IGV / IVA aplicado en facturas y boletas</small>
                            </Field>
                        </div>
                    </div>

                    {/* Logo */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>🖼️ Logo del Negocio</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
                            <div style={{ width: 120, height: 120, border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', overflow: 'hidden' }}>
                                {logoPreview
                                    ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}><Image size={32} /><div style={{ fontSize: '0.75rem', marginTop: 4 }}>Sin logo</div></div>
                                }
                            </div>
                            <div style={{ width: '100%' }}>
                                <label style={L}>Subir logo (PNG, JPG, WEBP)</label>
                                <input className="form-control" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} />
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Recomendado: 200×200px, fondo transparente</small>
                            </div>
                        </div>
                    </div>

                    {/* Botón guardar */}
                    <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }} disabled={saving}>
                            <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

const L = { display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };

export default Configuracion;
