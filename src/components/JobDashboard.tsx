"use client";

import React, { useState } from 'react';
import { FileSpreadsheet, Camera, Save, FolderPlus, CheckSquare, Users, Search } from 'lucide-react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generarPDF } from '../utils/pdfGenerator';
import ChatSystem from './ChatSystem';
import { User, Section, Message } from '../types';

interface JobProps {
  sections: Section[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  currentUser: User;
  adminUsers: User[];
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
}

interface InputRowProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  span?: number;
}

const InputRow = ({ label, value, onChange, span = 1 }: InputRowProps) => (
  <div className={`col-span-${span}`}>
    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={onChange}
      className="w-full rounded-xl px-4 py-3 outline-none text-sm transition-all duration-200"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    />
  </div>
);

export default function JobDashboard({ sections, messages, setMessages, currentUser, adminUsers, activeTab, setActiveTab }: JobProps) {
  const [reportType, setReportType] = useState('');

  const startReport = (type: string) => {
    setReportType(type);
    setActiveTab('form');
  };

  return (
    <div className="space-y-5">
      {activeTab === 'menu' && (
        <div
          className="rounded-2xl p-5 md:p-8 min-h-[600px]"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
        >
          <div className="flex flex-col items-center py-12 animate-in fade-in">
            <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Formato de Servicio</h2>
            <p className="text-sm mb-10" style={{ color: 'var(--text-secondary)' }}>Haz clic abajo para comenzar a llenar el reporte y generar el Excel.</p>
            <div className="w-full max-w-md">
              <button
                onClick={() => startReport('Preventivo')}
                className="w-full flex flex-col items-center justify-center p-10 rounded-3xl transition-all duration-200 hover:scale-[1.02]"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-md)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-lg)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-border)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-md)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                }}
              >
                <div className="p-5 rounded-2xl mb-5" style={{ backgroundColor: 'var(--accent-light)' }}>
                  <FileSpreadsheet className="w-12 h-12" style={{ color: 'var(--accent)' }} />
                </div>
                <span className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Reporte Preventivo</span>
                <span
                  className="text-xs font-semibold px-4 py-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
                >
                  Automático a Excel
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'form' && (
        <div
          className="rounded-2xl p-5 md:p-8 min-h-[600px]"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
        >
          <JobWizard type={reportType} sections={sections} currentUser={currentUser} onCancel={() => setActiveTab('menu')} />
        </div>
      )}

      {activeTab === 'chat' && (
        <div
          className="rounded-2xl p-5 md:p-8 min-h-[600px]"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
        >
          <ChatSystem messages={messages} setMessages={setMessages} currentUser={currentUser} allUsers={adminUsers} isJobView={true} />
        </div>
      )}
    </div>
  );
}

interface JobWizardProps {
  type: string;
  sections: Section[];
  currentUser: User;
  onCancel: () => void;
}

function JobWizard({ type, sections, currentUser, onCancel }: JobWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [sectionSearch, setSectionSearch] = useState<string>('');
  const [showSectionDropdown, setShowSectionDropdown] = useState<boolean>(false);

  const [data, setData] = useState({
    sectionId: '', client: '', direccion: '', contrato: '', partida: '', subpartida: '',
    tipoServicio: 'preventivo',
    equipo: '', marca: '', modelo: '', numSerieEq: '', folioSsm: '', ubicacion: '',
    falla: '', condiciones: '', trabajos: '',
    refacciones: ['', '', '', ''],
    medicion: [
      { equipo: '', marca: '', modelo: '', serie: '' },
      { equipo: '', marca: '', modelo: '', serie: '' },
      { equipo: '', marca: '', modelo: '', serie: '' },
    ],
    checklist1: Array(18).fill(false),
    checklist2: Array(12).fill(false),
    firmaEntrega: currentUser.name || '', firmaRecibe: '', firmaValida: '',
    fotos: { antes1: '', antes2: '', antes3: '', durante1: '', durante2: '', despues1: '', despues2: '' } as Record<string, string>,
  });

  const CHECKLIST_1 = [
    "Revisión, ajuste y limpieza de cada componente (condensadora, serpentines, filtros)",
    "Pintado para demarcación de áreas - NOM-031-STPS-2011",
    "Revisión, ajuste y limpieza a nivel componente, tarjetas, controladoras",
    "Limpieza de filtros Sistema mecánico, Condensadora",
    "Mantenimiento a motores con cambio de baleros (1 por año)",
    "Revisión y ajuste de presión de gas refrigerante",
    "Revisión de alimentación (voltajes, amperajes, revisión de fases)",
    "Cambio de filtro de aceite, reparación de fugas de gas",
    "Completar carga de gas refrigerante",
    "Cambio de sensores de baja presión",
    "Revisión y programación de tarjeta de control",
    "Revisión y programación eléctrica de equipos",
    "Revisión y programación de los equipos",
    "Medición de voltajes con respecto a tierra física",
    "Revisión y diagnóstico de indicadores visuales y audibles",
    "Revisión y programación de tarjeta de control del PLC",
    "Eliminación de fugas de aire, sellado de tapas, tornillerías",
    "Cambio de filtros absolutos HEPA 99.97% - 0.3 micras",
  ];

  const CHECKLIST_2 = [
    "Cambio de capacitor de arranque",
    "Limpieza de charola de condensados y sustitución de tubería",
    "Limpieza de aspas de condensador",
    "Limpieza de sensores de temperatura entrada y salida",
    "Medición de temperatura de evaporador y condensador",
    "Verificación de paros y arranques del compresor",
    "Verificación de funcionamiento de termostato",
    "Verificación de protección contra pérdida de fase",
    "Alineación de poleas y pruebas de operación",
    "Engrasado de partes mecánicas y chumaceras",
    "Cambio de filtros Celdek",
    "Rutina específica del anexo técnico",
  ];

  const TIPOS_SERVICIO = [
    { key: 'preventivo',   label: 'Preventivo'   },
    { key: 'correctivo',   label: 'Correctivo'   },
    { key: 'garantia',     label: 'Garantía'     },
    { key: 'diagnostico',  label: 'Diagnóstico'  },
    { key: 'instalacion',  label: 'Instalación'  },
    { key: 'capacitacion', label: 'Capacitación' },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fotoKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; const MAX_HEIGHT = 600;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          const base64Content = dataUrl.split(',')[1];
          setData(prev => ({ ...prev, fotos: { ...prev.fotos, [fotoKey]: base64Content } }));
        }
      };
      if (event.target && typeof event.target.result === 'string') img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (step !== 4) return;
    if (!data.sectionId || !data.client) return alert("Llena al menos la Carpeta y el Cliente en el Paso 1");
    setIsSaving(true);
    try {
      const snapshot = await getDocs(collection(db, 'reports'));
      const count = snapshot.size + 1;
      const serial = `MHOS-SSM-EL-${String(count).padStart(4, '0')}`;
      const finalReport = {
        serial, type: (type || 'Preventivo').toLowerCase(),
        jobId: currentUser.id, jobName: currentUser.name || currentUser.username,
        date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString(),
        ...data
      };
      await addDoc(collection(db, 'reports'), finalReport);
      await generarPDF(finalReport);
      alert(`¡Reporte Creado Exitosamente!\nFolio: ${serial}`);
      onCancel();
    } catch (_err) { alert("Error al guardar en la nube. Intenta de nuevo."); }
    setIsSaving(false);
  };

  const pageTitles = [
    "Paso 1: Datos Generales",
    "Paso 2: Checklist 1 — Rutina de Mantenimiento",
    "Paso 3: Checklist 2 — Revisión Complementaria",
    "Paso 4: Evidencia Fotográfica",
  ];
  const taStyle = { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' };

  const renderChecklist = (items: string[], state: boolean[], key: 'checklist1' | 'checklist2') => (
    <div className="animate-in fade-in space-y-5">
      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          Marca las casillas de las acciones que realizaste. En el PDF aparecerá una &quot;X&quot; en negritas.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        {items.map((item, index) => (
          <label
            key={index}
            className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={state[index]}
                onChange={e => {
                  const newChecks = [...state]; newChecks[index] = e.target.checked;
                  setData({ ...data, [key]: newChecks });
                }}
                className="sr-only"
              />
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200"
                style={{
                  backgroundColor: state[index] ? 'var(--success)' : 'transparent',
                  border: `2px solid ${state[index] ? 'var(--success)' : 'var(--border-strong)'}`,
                }}
              >
                {state[index] && (
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm leading-tight pt-0.5" style={{ color: state[index] ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Stepper Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-5 gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{pageTitles[step - 1]}</h2>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map(n => {
              const completed = step > n;
              const active = step === n;
              return (
                <div key={n} className="flex items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200"
                    style={{
                      backgroundColor: completed ? 'var(--success)' : active ? 'var(--accent)' : 'transparent',
                      border: `2px solid ${completed ? 'var(--success)' : active ? 'var(--accent)' : 'var(--border-strong)'}`,
                      color: completed || active ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {completed ? (
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l4 4 6-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : n}
                  </div>
                  {n < 4 && (
                    <div className="w-10 h-0.5 transition-all duration-200" style={{ backgroundColor: step > n ? 'var(--success)' : 'var(--border)' }} />
                  )}
                </div>
              );
            })}
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>Paso {step} de 4</span>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200"
          style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--danger-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; }}
        >
          Cancelar Formato
        </button>
      </div>

      <div className="space-y-8 min-h-[500px]">
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in">
            {/* Section selector */}
            <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
              <label className="block text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                <FolderPlus className="w-4 h-4" /> 1. ¿En qué Carpeta se guardará? (Obligatorio)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={showSectionDropdown ? sectionSearch : (sections.find(s => s.id === data.sectionId)?.name || '')}
                  onChange={e => { setSectionSearch(e.target.value); setShowSectionDropdown(true); }}
                  onFocus={() => { setSectionSearch(''); setShowSectionDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowSectionDropdown(false), 150)}
                  placeholder="Buscar carpeta..."
                  className="w-full pl-9 pr-4 py-3 rounded-xl outline-none text-sm transition-all duration-200"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-border)', color: 'var(--text-primary)' }}
                />
                {showSectionDropdown && (
                  <div className="absolute z-10 w-full mt-1 rounded-xl shadow-2xl max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    {sections.filter(s => s.name.toLowerCase().includes(sectionSearch.toLowerCase())).length === 0 ? (
                      <div className="p-3 text-sm text-center" style={{ color: 'var(--text-muted)' }}>Sin resultados</div>
                    ) : (
                      sections.filter(s => s.name.toLowerCase().includes(sectionSearch.toLowerCase())).map((s: Section) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => {
                            setData({ ...data, sectionId: s.id, client: s.client || '', direccion: s.direccion || '', contrato: s.contrato || '', partida: s.partida || '', equipo: s.equipo || '', marca: s.marca || '', modelo: s.modelo || '', numSerieEq: s.numSerieEq || '', folioSsm: s.folioSsm || '', ubicacion: s.ubicacion || '' });
                            setSectionSearch(''); setShowSectionDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-medium transition-colors duration-200"
                          style={{
                            backgroundColor: data.sectionId === s.id ? 'var(--accent-light)' : 'transparent',
                            color: data.sectionId === s.id ? 'var(--accent)' : 'var(--text-primary)',
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          <span className="block">{s.name}</span>
                          {s.client && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.client}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tipo de Servicio */}
            <div>
              <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Tipo de Servicio</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {TIPOS_SERVICIO.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setData({ ...data, tipoServicio: key })}
                    className="px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{
                      backgroundColor: data.tipoServicio === key ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: data.tipoServicio === key ? '#fff' : 'var(--text-secondary)',
                      border: `2px solid ${data.tipoServicio === key ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Datos Generales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputRow label="Cliente (Obligatorio)" value={data.client} onChange={e => setData({ ...data, client: e.target.value })} span={2} />
                <InputRow label="Dirección" value={data.direccion} onChange={e => setData({ ...data, direccion: e.target.value })} span={2} />
                <InputRow label="N° Contrato" value={data.contrato} onChange={e => setData({ ...data, contrato: e.target.value })} />
                <InputRow label="Partida" value={data.partida} onChange={e => setData({ ...data, partida: e.target.value })} />
                <InputRow label="Subpartida" value={data.subpartida} onChange={e => setData({ ...data, subpartida: e.target.value })} span={2} />
              </div>
            </div>

            <div>
              <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Datos del Equipo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputRow label="Equipo" value={data.equipo} onChange={e => setData({ ...data, equipo: e.target.value })} span={2} />
                <InputRow label="Marca" value={data.marca} onChange={e => setData({ ...data, marca: e.target.value })} />
                <InputRow label="Modelo" value={data.modelo} onChange={e => setData({ ...data, modelo: e.target.value })} />
                <InputRow label="N° Serie Equipo" value={data.numSerieEq} onChange={e => setData({ ...data, numSerieEq: e.target.value })} />
                <InputRow label="Folio SSM" value={data.folioSsm} onChange={e => setData({ ...data, folioSsm: e.target.value })} />
                <InputRow label="Ubicación" value={data.ubicacion} onChange={e => setData({ ...data, ubicacion: e.target.value })} span={2} />
              </div>
            </div>

            <div>
              <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Reporte de Servicio</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Falla Reportada</label>
                  <textarea rows={2} value={data.falla} onChange={e => setData({ ...data, falla: e.target.value })} className="w-full rounded-xl p-3 text-sm outline-none transition-all duration-200" style={taStyle} onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}></textarea>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Condiciones Iniciales</label>
                  <textarea rows={2} value={data.condiciones} onChange={e => setData({ ...data, condiciones: e.target.value })} className="w-full rounded-xl p-3 text-sm outline-none transition-all duration-200" style={taStyle} onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}></textarea>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Trabajos Realizados / Observaciones</label>
                  <textarea rows={4} value={data.trabajos} onChange={e => setData({ ...data, trabajos: e.target.value })} className="w-full rounded-xl p-3 text-sm outline-none transition-all duration-200" style={taStyle} onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}></textarea>
                </div>
                <div className="pt-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Refacciones Utilizadas (Máximo 4)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.refacciones.map((ref, i) => (
                      <input key={i} type="text" value={ref} onChange={e => { const newRef = [...data.refacciones]; newRef[i] = e.target.value; setData({ ...data, refacciones: newRef }); }} className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200" style={taStyle} placeholder={`Refacción ${i + 1}`} onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Equipo de Medición Utilizado</h3>
              <div className="space-y-3">
                {data.medicion.map((med, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" placeholder="Equipo" value={med.equipo} onChange={e => { const nM = [...data.medicion]; nM[i].equipo = e.target.value; setData({ ...data, medicion: nM }); }} className="w-1/4 rounded-lg px-3 py-2 text-xs outline-none transition-all duration-200" style={taStyle} onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                    <input type="text" placeholder="Marca" value={med.marca} onChange={e => { const nM = [...data.medicion]; nM[i].marca = e.target.value; setData({ ...data, medicion: nM }); }} className="w-1/4 rounded-lg px-3 py-2 text-xs outline-none transition-all duration-200" style={taStyle} onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                    <input type="text" placeholder="Modelo" value={med.modelo} onChange={e => { const nM = [...data.medicion]; nM[i].modelo = e.target.value; setData({ ...data, medicion: nM }); }} className="w-1/4 rounded-lg px-3 py-2 text-xs outline-none transition-all duration-200" style={taStyle} onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                    <input type="text" placeholder="N° Serie" value={med.serie} onChange={e => { const nM = [...data.medicion]; nM[i].serie = e.target.value; setData({ ...data, medicion: nM }); }} className="w-1/4 rounded-lg px-3 py-2 text-xs outline-none transition-all duration-200" style={taStyle} onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold mb-4 text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Users className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> Nombres y Firmas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <InputRow label="Nombre y Firma (Entrega)" value={data.firmaEntrega} onChange={e => setData({ ...data, firmaEntrega: e.target.value })} />
                <InputRow label="Recibe / Autoriza" value={data.firmaRecibe} onChange={e => setData({ ...data, firmaRecibe: e.target.value })} />
                <InputRow label="Valida" value={data.firmaValida} onChange={e => setData({ ...data, firmaValida: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && renderChecklist(CHECKLIST_1, data.checklist1, 'checklist1')}
        {step === 3 && renderChecklist(CHECKLIST_2, data.checklist2, 'checklist2')}

        {step === 4 && (
          <div className="space-y-5 animate-in fade-in">
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--warning-light)', border: '1px solid var(--warning)' }}>
              <h3 className="font-bold text-base mb-1" style={{ color: 'var(--warning)' }}>Evidencia Fotográfica</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sube las fotos desde tu celular. El sistema las comprimirá y acomodará en la Página 4 del PDF.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'antes1', label: 'Antes 1' }, { key: 'antes2', label: 'Antes 2' }, { key: 'antes3', label: 'Antes 3' },
                { key: 'durante1', label: 'Durante 1' }, { key: 'durante2', label: 'Durante 2' },
                { key: 'despues1', label: 'Después 1' }, { key: 'despues2', label: 'Después 2' },
              ].map((fotoInfo) => (
                <div
                  key={fotoInfo.key}
                  className="border-2 border-dashed p-6 rounded-xl text-center relative transition-all duration-200 h-32 flex flex-col justify-center items-center"
                  style={{ borderColor: data.fotos[fotoInfo.key] ? 'var(--success)' : 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
                >
                  {data.fotos[fotoInfo.key] ? (
                    <div className="flex flex-col items-center" style={{ color: 'var(--success)' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'var(--success-light)' }}>
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold">¡Foto Lista!</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center" style={{ color: 'var(--text-muted)' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium">{fotoInfo.label}</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, fotoInfo.key)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-8 mt-8" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-0"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          Atrás
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-4 rounded-xl font-bold text-base flex items-center gap-2 transition-all duration-200"
            style={{ backgroundColor: 'var(--success)', color: '#fff', opacity: isSaving ? 0.7 : 1 }}
          >
            {isSaving ? 'Guardando...' : <><Save className="w-5 h-5" /> Guardar y Generar PDF</>}
          </button>
        )}
      </div>
    </div>
  );
}
