"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDoc, query, onSnapshot, orderBy, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Menu, Sun, Moon } from 'lucide-react';

import { User, Section, Report, Message, AppNotification } from '../types';
import LoginView from '../components/LoginView';
import Sidebar from '../components/Sidebar';
import AdminDashboard from '../components/AdminDashboard';
import JobDashboard from '../components/JobDashboard';
import ProfileSettings from '../components/ProfileSettings';

// Modo rescate: usa NEXT_PUBLIC_FORCE_ADMIN=true solo si necesitas recuperar acceso admin.
const FORZAR_ADMIN_SIEMPRE = process.env.NEXT_PUBLIC_FORCE_ADMIN === 'true';

const TAB_LABELS: Record<string, string> = {
  buzon: 'Buzón de Reportes',
  secciones: 'Gestión de Secciones',
  usuarios: 'Usuarios y Accesos',
  chat: 'Chat con Jobs',
  hacer_reporte: 'Hacer Reporte',
  notificaciones: 'Notificaciones',
  metricas: 'Metricas',
  respaldos: 'Respaldos',
  form: 'Formulario de Servicio',
  menu: 'Hacer Formatos',
  perfil: 'Mi Perfil',
};

const normalizeText = (value: unknown) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const normalizeRole = (data: Record<string, unknown>, authEmail?: string | null): User['role'] => {
  const roleText = normalizeText(data.role ?? data.rol ?? data.type ?? data.tipo);
  const identityText = [data.name, data.username, authEmail].map(normalizeText).join(' ');

  if (roleText.includes('admin') || roleText.includes('administrador') || identityText.includes('admin')) {
    return 'admin';
  }

  return 'job';
};

const normalizeUserDoc = (id: string, data: Record<string, unknown>, authEmail?: string | null, authUid?: string | null): User => ({
  id,
  authUid: authUid || (typeof data.authUid === 'string' ? data.authUid : id),
  ...(data as Omit<User, 'id' | 'role'>),
  role: normalizeRole(data, authEmail),
  name: String(data.name || authEmail?.split('@')[0] || 'Usuario'),
  username: String(data.username || authEmail || ''),
  password: typeof data.password === 'string' ? data.password : undefined,
  nickname: typeof data.nickname === 'string' ? data.nickname : '',
  phone: typeof data.phone === 'string' ? data.phone : '',
  photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
  profileColor: typeof data.profileColor === 'string' ? data.profileColor : '',
  canAccessReports: data.canAccessReports === true,
  canManageSections: data.canManageSections === true,
});

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<string>('buzon');
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem('darkMode', String(darkMode));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleDark = () => {
    setDarkMode(prev => !prev);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let userData: Record<string, unknown> = {};
          let docId = firebaseUser.uid;

          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

          if (userDoc.exists()) {
            userData = userDoc.data() as Record<string, unknown>;
          } else if (firebaseUser.email) {
            const q = query(collection(db, 'users'), where('username', '==', firebaseUser.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              userData = querySnapshot.docs[0].data() as Record<string, unknown>;
              docId = querySnapshot.docs[0].id;
            }
          }

          if (userData || FORZAR_ADMIN_SIEMPRE) {
            const safeUserData = (userData && Object.keys(userData).length > 0)
              ? userData
              : { name: 'Admin Maestro', username: firebaseUser.email, role: 'admin' };

            const finalRole = FORZAR_ADMIN_SIEMPRE ? 'admin' : normalizeRole(safeUserData, firebaseUser.email);
            const normalizedUser = normalizeUserDoc(docId, { ...safeUserData, role: finalRole }, firebaseUser.email, firebaseUser.uid);

            setCurrentUser(normalizedUser);
            setActiveTab(finalRole === 'admin' ? 'buzon' : 'menu');
          } else {
            setCurrentUser({
              id: firebaseUser.uid,
              authUid: firebaseUser.uid,
              name: firebaseUser.email?.split('@')[0] || 'Usuario',
              role: 'job',
              username: firebaseUser.email || '',
              nickname: '',
              phone: '',
              photoUrl: '',
              profileColor: '',
              canAccessReports: false,
              canManageSections: false
            });
            setActiveTab('menu');
          }
        } catch (error) {
          console.error("Error leyendo usuario:", error);
        }
      } else {
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribers: Array<() => void> = [];
    const isAdmin = currentUser.role === 'admin';
    const onDenied = (label: string, fallback: () => void) => (error: unknown) => {
      console.warn('Listener de Firestore sin permiso:', label, error);
      fallback();
    };

    if (isAdmin) {
      unsubscribers.push(onSnapshot(
        query(collection(db, 'users')),
        snapshot => setUsers(snapshot.docs.map(d => normalizeUserDoc(d.id, d.data() as Record<string, unknown>))),
        onDenied('users', () => setUsers([currentUser]))
      ));
    } else {
      unsubscribers.push(onSnapshot(
        query(collection(db, 'users'), where('role', '==', 'admin')),
        snapshot => setUsers([currentUser, ...snapshot.docs.map(d => normalizeUserDoc(d.id, d.data() as Record<string, unknown>))]),
        onDenied('users-admin', () => setUsers([currentUser]))
      ));
    }

    unsubscribers.push(onSnapshot(
      query(collection(db, 'sections')),
      snapshot => setSections(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Section))),
      onDenied('sections', () => setSections([]))
    ));

    unsubscribers.push(onSnapshot(
      query(collection(db, 'reports'), orderBy('createdAt', 'desc')),
      snapshot => setReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Report))),
      onDenied('reports', () => setReports([]))
    ));

    unsubscribers.push(onSnapshot(
      query(collection(db, 'messages'), orderBy('createdAt', 'asc')),
      snapshot => setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message))),
      onDenied('messages', () => setMessages([]))
    ));

    if (isAdmin) {
      unsubscribers.push(onSnapshot(
        query(collection(db, 'notifications'), orderBy('createdAt', 'desc')),
        snapshot => setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification))),
        onDenied('notifications', () => setNotifications([]))
      ));
    } else {
      queueMicrotask(() => setNotifications([]));
    }

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [currentUser]);

  if (loadingAuth) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-14 h-14 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
        />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Cargando sistema...</p>
      </div>
    </div>
  );

  if (!currentUser) return <LoginView />;

  const currentTabLabel = TAB_LABELS[activeTab] || 'Panel';
  const displayName = currentUser.nickname || currentUser.name || 'Usuario';
  const firstName = displayName.split(' ')[0];
  const initials = (currentUser.name || currentUser.username || 'U').split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const profileColor = currentUser.profileColor || 'var(--accent)';
  const workerAllowedAdminTabs: Array<'buzon' | 'secciones'> = [
    ...(currentUser.canAccessReports ? ['buzon' as const] : []),
    ...(currentUser.canManageSections ? ['secciones' as const] : []),
  ];
  const isWorkerAllowedAdminTab = currentUser.role !== 'admin' && workerAllowedAdminTabs.includes(activeTab as 'buzon' | 'secciones');

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>

      <Sidebar
        currentUser={currentUser}
        onLogout={() => signOut(auth)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header
          className="flex justify-between items-center px-6 py-4 z-10 shrink-0"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl transition-all duration-200"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>EspecialistasHVAC</span>
                <span className="text-xs" style={{ color: 'var(--border-strong)' }}>/</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{currentTabLabel}</span>
              </div>
              <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                Bienvenido, {firstName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: 'var(--success-light)', border: '1px solid var(--success)' }}
            >
              <span className="w-2 h-2 rounded-full status-dot" style={{ backgroundColor: 'var(--success)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>Sistema Activo</span>
            </div>

            <button
              onClick={toggleDark}
              className="p-2.5 rounded-xl transition-all duration-200"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              title={darkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 overflow-hidden"
              style={{ backgroundColor: profileColor }}
              title={currentUser.name || 'Usuario'}
            >
              {currentUser.photoUrl ? (
                <img src={currentUser.photoUrl} alt={currentUser.name || 'Foto de perfil'} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'perfil' ? (
              <ProfileSettings currentUser={currentUser} setCurrentUser={setCurrentUser} />
            ) : currentUser.role === 'admin' ? (
              <AdminDashboard
                sections={sections}
                reports={reports}
                messages={messages}
                setMessages={setMessages}
                currentUser={currentUser}
                users={users}
                notifications={notifications}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            ) : isWorkerAllowedAdminTab ? (
              <AdminDashboard
                sections={sections}
                reports={reports}
                messages={messages}
                setMessages={setMessages}
                currentUser={currentUser}
                users={users}
                notifications={notifications}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                allowedTabs={workerAllowedAdminTabs}
                canEditReports={false}
              />
            ) : (
              <JobDashboard
                sections={sections}
                messages={messages}
                setMessages={setMessages}
                currentUser={currentUser}
                adminUsers={users.filter(u => u.role === 'admin')}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
