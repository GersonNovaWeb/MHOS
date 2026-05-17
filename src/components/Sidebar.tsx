"use client";

import React from 'react';
import { FolderPlus, FileText, Users, MessageSquare, LogOut, FileSpreadsheet, X, Zap, UserCircle, Bell, BarChart, Archive } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentUser: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  isOpen?: boolean;
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Sidebar({ currentUser, onLogout, activeTab, setActiveTab, isOpen = false, setIsOpen }: SidebarProps) {

  const handleNav = (tab: string) => {
    setActiveTab(tab);
    if (setIsOpen) setIsOpen(false);
  };

  const initials = (currentUser.name || currentUser.username || 'U').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const roleLabel = currentUser.role === 'admin' ? 'Administrador' : 'Tecnico';
  const profileColor = currentUser.profileColor || 'var(--accent)';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setIsOpen && setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 ease-out
          md:relative md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          width: '280px',
          backgroundColor: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 20px rgba(37,99,235,0.25)' }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
              EspecialistasHVAC
            </span>
          </div>
          <button
            onClick={() => setIsOpen && setIsOpen(false)}
            className="md:hidden p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 overflow-y-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-3 px-4" style={{ color: 'var(--text-muted)' }}>
            Menú
          </p>
          <div className="space-y-1">
            {currentUser.role === 'admin' ? (
              <>
                <NavItem icon={<FileText />} label="Buzón de Reportes" active={activeTab === 'buzon'} onClick={() => handleNav('buzon')} />
                <NavItem icon={<FileSpreadsheet />} label="Hacer Reporte" active={activeTab === 'hacer_reporte' || activeTab === 'form'} onClick={() => handleNav('hacer_reporte')} />
                <NavItem icon={<FolderPlus />} label="Gestión Secciones" active={activeTab === 'secciones'} onClick={() => handleNav('secciones')} />
                <NavItem icon={<Bell />} label="Notificaciones" active={activeTab === 'notificaciones'} onClick={() => handleNav('notificaciones')} />
                <NavItem icon={<BarChart />} label="Metricas" active={activeTab === 'metricas'} onClick={() => handleNav('metricas')} />
                <NavItem icon={<Archive />} label="Respaldos" active={activeTab === 'respaldos'} onClick={() => handleNav('respaldos')} />
                <NavItem icon={<Users />} label="Usuarios y Accesos" active={activeTab === 'usuarios'} onClick={() => handleNav('usuarios')} />
                <NavItem icon={<UserCircle />} label="Mi Perfil" active={activeTab === 'perfil'} onClick={() => handleNav('perfil')} />
                <NavItem icon={<MessageSquare />} label="Chat con Jobs" active={activeTab === 'chat'} onClick={() => handleNav('chat')} />
              </>
            ) : (
              <>
                {currentUser.canAccessReports && <NavItem icon={<FileText />} label="Buzon de Reportes" active={activeTab === 'buzon'} onClick={() => handleNav('buzon')} />}
                <NavItem icon={<FileSpreadsheet />} label="Hacer Formatos" active={activeTab === 'menu' || activeTab === 'form'} onClick={() => handleNav('menu')} />
                {currentUser.canManageSections && <NavItem icon={<FolderPlus />} label="Gestion Secciones" active={activeTab === 'secciones'} onClick={() => handleNav('secciones')} />}
                <NavItem icon={<UserCircle />} label="Mi Perfil" active={activeTab === 'perfil'} onClick={() => handleNav('perfil')} />
                <NavItem icon={<MessageSquare />} label="Soporte (Chat)" active={activeTab === 'chat'} onClick={() => handleNav('chat')} />
              </>
            )}
          </div>
        </nav>

        {/* User card + logout */}
        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl mb-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 text-white overflow-hidden"
              style={{ backgroundColor: profileColor }}
            >
              {currentUser.photoUrl ? (
                <img src={currentUser.photoUrl} alt={currentUser.name || 'Foto de perfil'} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {currentUser.name || 'Usuario'}
              </p>
              <p className="text-[10px] uppercase tracking-widest font-medium truncate" style={{ color: 'var(--text-muted)' }}>
                {currentUser.nickname ? currentUser.nickname + ' / ' + roleLabel : roleLabel}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2.5 w-full px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200"
            style={{ color: 'var(--danger)', border: '1px solid var(--border)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--danger-light)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--danger)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            }}
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactElement; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all duration-200 relative"
      style={{
        backgroundColor: active ? 'var(--accent-light)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-tertiary)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
        }
      }}
    >
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className: `w-5 h-5 shrink-0 transition-transform duration-200 ${active ? 'scale-110' : ''}`,
      })}
      <span>{label}</span>
    </button>
  );
}
