import React, { useState } from 'react';
import { Camera, Save, UserCircle, Palette, ShieldCheck, Mail } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';

interface ProfileSettingsProps {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const DEFAULT_PROFILE_COLOR = '#2563eb';
const PROFILE_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#111827', '#64748b'];

export default function ProfileSettings({ currentUser, setCurrentUser }: ProfileSettingsProps) {
  const [form, setForm] = useState({
    name: currentUser.name || '',
    nickname: currentUser.nickname || '',
    phone: currentUser.phone || '',
    photoUrl: currentUser.photoUrl || '',
    profileColor: currentUser.profileColor || DEFAULT_PROFILE_COLOR,
  });
  const [isSaving, setIsSaving] = useState(false);

  const initials = (form.name || currentUser.username || 'U')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleLabel = currentUser.role === 'admin' ? 'Administrador' : 'Tecnico';
  const inputCls = 'w-full rounded-xl px-4 py-3 outline-none text-sm transition-all duration-200';
  const inputStyle = { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
  const lbl = 'block text-xs font-semibold uppercase tracking-wider mb-2';
  const focus = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = 'var(--accent)');
  const blur = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = 'var(--border)');

  const resizeProfileImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo preparar la imagen.'));
          return;
        }
        const scale = Math.max(size / img.width, size / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = String(event.target?.result || '');
    };
    reader.readAsDataURL(file);
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecciona un archivo de imagen.');
      return;
    }
    try {
      const photoUrl = await resizeProfileImage(file);
      setForm(prev => ({ ...prev, photoUrl }));
    } catch {
      alert('No se pudo cargar la imagen de perfil.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('El nombre completo es obligatorio.');
    setIsSaving(true);
    try {
      const updates = {
        name: form.name.trim(),
        nickname: form.nickname.trim(),
        phone: form.phone.trim(),
        photoUrl: form.photoUrl,
        profileColor: form.profileColor || DEFAULT_PROFILE_COLOR,
        username: currentUser.username,
        role: currentUser.role,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', currentUser.id), updates, { merge: true });
      setCurrentUser(prev => prev ? { ...prev, ...updates } : prev);
      alert('Perfil actualizado correctamente.');
    } catch {
      alert('Error al actualizar el perfil.');
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in">
      <div className="pb-5 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <UserCircle className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          Mi Perfil
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Actualiza tu informacion personal de la cuenta.</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <section className="rounded-2xl p-6 h-fit" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex flex-col items-center text-center">
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center font-bold text-3xl text-white overflow-hidden"
              style={{ backgroundColor: form.profileColor || DEFAULT_PROFILE_COLOR, border: '1px solid var(--border)' }}
            >
              {form.photoUrl ? (
                <img src={form.photoUrl} alt={form.name || 'Foto de perfil'} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>

            <label
              className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
            >
              <Camera className="w-4 h-4" />
              Cambiar foto
              <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
            </label>

            {form.photoUrl && (
              <button type="button" onClick={() => setForm(prev => ({ ...prev, photoUrl: '' }))} className="mt-3 text-xs font-semibold" style={{ color: 'var(--danger)' }}>
                Quitar foto
              </button>
            )}

            <div className="w-full mt-6 pt-5 text-left space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{currentUser.username}</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{roleLabel}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl p-6 md:p-8" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className={lbl} style={{ color: 'var(--text-muted)' }}>Nombre Completo</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--text-muted)' }}>Apodo</label>
              <input type="text" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} className={inputCls} style={inputStyle} onFocus={focus} onBlur={blur} placeholder="Opcional" />
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--text-muted)' }}>Telefono</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} style={inputStyle} onFocus={focus} onBlur={blur} placeholder="+52 555 000 0000" />
            </div>
            <div className="md:col-span-2">
              <label className={lbl} style={{ color: 'var(--text-muted)' }}>Color de Perfil</label>
              <div className="flex flex-wrap items-center gap-2">
                {PROFILE_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    aria-label={'Color ' + color}
                    title={'Color ' + color}
                    onClick={() => setForm({ ...form, profileColor: color })}
                    className="w-9 h-9 rounded-full transition-transform duration-200"
                    style={{
                      backgroundColor: color,
                      border: form.profileColor === color ? '3px solid var(--text-primary)' : '2px solid var(--border)',
                      transform: form.profileColor === color ? 'scale(1.08)' : 'scale(1)',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={form.profileColor || DEFAULT_PROFILE_COLOR}
                  onChange={e => setForm({ ...form, profileColor: e.target.value })}
                  className="w-10 h-10 cursor-pointer rounded-full overflow-hidden"
                  title="Color personalizado"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 flex justify-end" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', opacity: isSaving ? 0.7 : 1 }}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Guardando...' : 'Guardar Perfil'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
