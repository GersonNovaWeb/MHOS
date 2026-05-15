"use client";

import React, { useState } from 'react';
import { FolderPlus, Download, Plus, Eye, EyeOff, ChevronDown, ChevronUp, Tag, FileText, Users, MessageSquare, BarChart, FileSpreadsheet, Camera, CheckSquare, Save, Search, Printer, Pencil, Trash2, X } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generarExcel, generarExcelBuffer, generarDiagnosticoTorreBuffer, generarMhosA0143Buffer, generarDiagnosticoTorre, generarMhosA0143 } from '../utils/excelGenerator';
import { generarPDF } from '../utils/pdfGenerator';
import ChatSystem from './ChatSystem';
import { User, Section, Report, Message, ReportTorre } from '../types';

interface AdminDashboardProps {
  sections: Section[];
  reports: Report[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  currentUser: User;
  users: User[];
  activeTab?: string;
  setActiveTab?: React.Dispatch<React.SetStateAction<string>>;
}

export default function AdminDashboard({ sections, reports, messages, setMessages, currentUser, users, activeTab, setActiveTab }: AdminDashboardProps) {
  const [localActiveTab, setLocalActiveTab] = useState<string>('buzon');
  const currentTab = activeTab !== undefined ? activeTab : localActiveTab;
  const setCurrentTab = setActiveTab !== undefined ? setActiveTab : setLocalActiveTab;
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingReport, setEditingReport] = useState<(Report & Partial<ReportTorre>) | null>(null);
  const [defaultSectionId, setDefaultSectionId] = useState<string>('');

  const handleEditReport = async (report: Report) => {
    try {
      const snap = await getDoc(doc(db, 'reports', report.id));
      const fullData = snap.exists() ? { id: snap.id, ...snap.data() } as Report & Partial<ReportTorre> : report as Report & Partial<ReportTorre>;
      setEditingReport(fullData);
    } catch {
      setEditingReport(report as Report & Partial<ReportTorre>);
    }
    setCurrentTab('edit_report');
  };

  const filteredReports = reports?.filter((r: Report) =>
    (r.serial && r.serial.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.client && r.client.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.jobName && r.jobName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.type && r.type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Tab pills */}
      <div
        className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide rounded-2xl p-1 -mx-1"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <TabButton active={currentTab === 'buzon'} onClick={() => setCurrentTab('buzon')} icon={<FileText />} label="Buzón Reportes" />
        <TabButton active={currentTab === 'secciones'} onClick={() => setCurrentTab('secciones')} icon={<FolderPlus />} label="Gestión Carpetas" />
        <TabButton active={currentTab === 'usuarios'} onClick={() => setCurrentTab('usuarios')} icon={<Users />} label="Cuentas Personal" />
        <TabButton active={currentTab === 'chat'} onClick={() => setCurrentTab('chat')} icon={<MessageSquare />} label="Chat Central" />
        <TabButton active={currentTab === 'hacer_reporte' || currentTab === 'form' || currentTab === 'form_preventivo' || currentTab === 'form_diagnostico' || currentTab === 'edit_report'} onClick={() => setCurrentTab('hacer_reporte')} icon={<FileSpreadsheet />} label="Hacer Reporte" />
      </div>

      {/* Content card */}
      <div
        className="rounded-2xl p-5 md:p-8 min-h-[600px]"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
      >
        {currentTab === 'buzon' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Buzón de Operaciones</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Revisa y descarga los reportes generados.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative w-full sm:w-auto">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Buscar reporte..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none w-full sm:w-64 transition-all duration-200"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div
                  className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                  style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}
                >
                  <BarChart className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{(filteredReports?.length || 0)} Reportes</span>
                </div>
              </div>
            </div>

            {(sections?.length || 0) === 0 ? (
              <div
                className="text-center py-16 rounded-2xl border-2 border-dashed"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <FolderPlus className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Tu entorno está limpio</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Crea tu primera carpeta para comenzar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((section: Section) => {
                  const secReps = filteredReports?.filter((r: Report) => r.sectionId === section.id);
                  if (searchTerm && (secReps?.length || 0) === 0) return null;
                  return <AccordionItem key={section.id} section={section} reports={secReps} onEdit={handleEditReport} onNewReport={(s) => { setDefaultSectionId(s.id); setCurrentTab(s.type === 'diagnostico' ? 'form_diagnostico' : 'form_preventivo'); }} />;
                })}
                {searchTerm && (filteredReports?.length || 0) === 0 && (
                  <div
                    className="text-center py-10 rounded-2xl border border-dashed"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <Search className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>No se encontraron reportes</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Intenta con otros términos.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentTab === 'secciones' && <SectionManager sections={sections} />}
        {currentTab === 'usuarios' && <UserManager users={users} />}
        {currentTab === 'chat' && <ChatSystem messages={messages} setMessages={setMessages} currentUser={currentUser} allUsers={users} />}

        {currentTab === 'hacer_reporte' && (
          <div className="flex flex-col items-center py-12 animate-in fade-in">
            <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Formato de Servicio (Admin)</h2>
            <p className="text-sm mb-10" style={{ color: 'var(--text-secondary)' }}>Selecciona el tipo de reporte para comenzar a llenarlo.</p>
            <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-5">
              {([
                { tab: 'form_preventivo', label: 'Reporte Preventivo', accentVar: 'var(--accent)', lightVar: 'var(--accent-light)', borderVar: 'var(--accent-border)' },
                { tab: 'form_diagnostico', label: 'Reporte de Diagnóstico', accentVar: 'var(--warning)', lightVar: 'var(--warning-light)', borderVar: 'var(--warning)' },
              ] as const).map(({ tab, label, accentVar, lightVar, borderVar }) => (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(tab)}
                  className="w-full flex flex-col items-center justify-center p-10 rounded-3xl transition-all duration-200 hover:scale-[1.02]"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-lg)'; (e.currentTarget as HTMLButtonElement).style.borderColor = borderVar; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                >
                  <div className="p-5 rounded-2xl mb-5" style={{ backgroundColor: lightVar }}>
                    <FileSpreadsheet className="w-12 h-12" style={{ color: accentVar }} />
                  </div>
                  <span className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  <span className="text-xs font-semibold px-4 py-1.5 rounded-full" style={{ backgroundColor: lightVar, color: accentVar, border: `1px solid ${borderVar}` }}>
                    Automático a Excel
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentTab === 'form' && (
          <AdminJobWizard type="Preventivo" sections={sections} currentUser={currentUser} onCancel={() => setCurrentTab('hacer_reporte')} />
        )}

        {(currentTab === 'form_preventivo' || currentTab === 'form_diagnostico') && (
          <TorreWizard
            type={currentTab === 'form_preventivo' ? 'preventivo' : 'diagnostico'}
            sections={sections}
            currentUser={currentUser}
            onCancel={() => setCurrentTab('hacer_reporte')}
            defaultSectionId={defaultSectionId}
          />
        )}

        {currentTab === 'edit_report' && editingReport && (
          <TorreWizard
            type={editingReport.type === 'diagnostico' ? 'diagnostico' : 'preventivo'}
            sections={sections}
            currentUser={currentUser}
            onCancel={() => { setEditingReport(null); setCurrentTab('buzon'); }}
            initialData={editingReport}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactElement; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap shrink-0"
      style={{
        backgroundColor: active ? 'var(--bg-card)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 500,
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
      }}
    >
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4' })}
      {label}
    </button>
  );
}

function AccordionItem({ section, reports, onEdit, onNewReport }: { section: Section; reports: Report[]; onEdit?: (r: Report) => void; onNewReport?: (s: Section) => void }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        border: `1px solid ${isOpen ? 'var(--accent-border)' : 'var(--border)'}`,
        backgroundColor: 'var(--bg-card)',
        boxShadow: isOpen ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-5 transition-colors duration-200"
        style={{ backgroundColor: isOpen ? 'var(--accent-light)' : 'transparent' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="p-2.5 rounded-xl transition-colors duration-200"
            style={{
              backgroundColor: isOpen ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: isOpen ? '#fff' : 'var(--text-muted)',
            }}
          >
            <FolderPlus className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="block font-bold text-base" style={{ color: 'var(--text-primary)' }}>{section.name}</span>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md mt-1 inline-block"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            >
              {(reports?.length || 0)} {(reports?.length || 0) === 1 ? 'documento' : 'documentos'}
            </span>
          </div>
        </div>
        <div
          className="p-2 rounded-full transition-colors duration-200"
          style={{
            backgroundColor: isOpen ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: isOpen ? '#fff' : 'var(--text-muted)',
          }}
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 md:p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
          {onNewReport && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => onNewReport(section)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
              >
                <Plus className="w-4 h-4" /> Nuevo Reporte
              </button>
            </div>
          )}
          {(reports?.length || 0) === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Esta carpeta está vacía.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {reports.map((report: Report) => (
                <div
                  key={report.id}
                  className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 rounded-xl transition-all duration-200 group"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
                >
                  <div className="mb-4 md:mb-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-bold text-lg" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {report.serial}
                      </span>
                      <span
                        className="text-[10px] px-2.5 py-1 rounded-md uppercase font-bold tracking-wider"
                        style={
                          report.type === 'Preventivo'
                            ? { backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)' }
                            : { backgroundColor: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid var(--warning)' }
                        }
                      >
                        {report.type}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <p style={{ color: 'var(--text-secondary)' }}><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Cliente:</span> {report.client}</p>
                      <p style={{ color: 'var(--text-secondary)' }}><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Técnico:</span> {report.jobName}</p>
                    </div>
                    <p className="text-xs mt-2 font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {report.date}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(report)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                        style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
                      >
                        <Pencil className="w-4 h-4" /> Editar
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (report.type === 'diagnostico') {
                          generarDiagnosticoTorre(report);
                        } else if (report.type === 'preventivo') {
                          generarMhosA0143(report);
                        } else {
                          generarExcel(report);
                        }
                      }}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                      style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--success)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--success-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--success)'; }}
                    >
                      <Download className="w-4 h-4" /> Excel
                    </button>
                    <button
                      onClick={() => {
                        if (report.type === 'diagnostico') {
                          generarPDF({ ...report, _generator: 'diagnostico' });
                        } else {
                          generarPDF(report);
                        }
                      }}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                      style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--danger-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; }}
                    >
                      <Printer className="w-4 h-4" /> PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section Manager ──────────────────────────────────────────────────────────

const SECTION_EMPTY = { name: '', type: 'preventivo' as 'preventivo' | 'diagnostico', client: '', direccion: '', contrato: '', partida: '', equipo: '', marca: '', modelo: '', numSerieEq: '', folioSsm: '', ubicacion: '' };

function SectionFormFields({ form, setForm }: { form: typeof SECTION_EMPTY; setForm: (f: typeof SECTION_EMPTY) => void }) {
  const f = (field: keyof typeof SECTION_EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });
  const cls = "w-full rounded-xl px-4 py-3 outline-none text-sm transition-all duration-200";
  const cls2 = { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
  const lbl = "block text-xs font-semibold uppercase tracking-wider mb-1.5";

  const inputProps = {
    className: cls,
    style: cls2,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = 'var(--accent)'),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = 'var(--border)'),
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <label className={lbl} style={{ color: 'var(--text-muted)' }}>Tipo de Carpeta</label>
        <select
          value={form.type}
          onChange={e => setForm({ ...form, type: e.target.value as 'preventivo' | 'diagnostico' })}
          className={cls}
          style={cls2}
          onFocus={(e: React.FocusEvent<HTMLSelectElement>) => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={(e: React.FocusEvent<HTMLSelectElement>) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <option value="preventivo">Mantenimiento Preventivo</option>
          <option value="diagnostico">Diagnóstico</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={lbl} style={{ color: 'var(--text-muted)' }}>Nombre de Carpeta (Obligatorio)</label>
        <input type="text" required value={form.name} onChange={f('name')} placeholder="Ej: Mantenimiento Preventivo 2024" {...inputProps} />
      </div>
      <p className="sm:col-span-2 text-xs font-bold uppercase tracking-widest pt-1" style={{ color: 'var(--accent)', borderTop: '1px solid var(--border)' }}>Datos del Cliente</p>
      <div className="sm:col-span-2">
        <label className={lbl} style={{ color: 'var(--text-muted)' }}>Nombre del Cliente</label>
        <input type="text" value={form.client} onChange={f('client')} placeholder="Ej: Hospital General del Norte" {...inputProps} />
      </div>
      <div className="sm:col-span-2">
        <label className={lbl} style={{ color: 'var(--text-muted)' }}>Dirección</label>
        <input type="text" value={form.direccion} onChange={f('direccion')} placeholder="Ej: Av. Principal #123" {...inputProps} />
      </div>
      <div>
        <label className={lbl} style={{ color: 'var(--text-muted)' }}>N° Contrato</label>
        <input type="text" value={form.contrato} onChange={f('contrato')} placeholder="CONT-2024-001" {...inputProps} />
      </div>
      <div>
        <label className={lbl} style={{ color: 'var(--text-muted)' }}>Partida</label>
        <input type="text" value={form.partida} onChange={f('partida')} placeholder="001" {...inputProps} />
      </div>
      <p className="sm:col-span-2 text-xs font-bold uppercase tracking-widest pt-1" style={{ color: 'var(--accent)', borderTop: '1px solid var(--border)' }}>Datos del Equipo</p>
      <div className="sm:col-span-2">
        <label className={lbl} style={{ color: 'var(--text-muted)' }}>Equipo</label>
        <input type="text" value={form.equipo} onChange={f('equipo')} placeholder="Ej: Unidad Manejadora de Aire" {...inputProps} />
      </div>
      <div>
        <label className={lbl} style={{ color: 'var(--text-muted)' }}>Marca</label>
        <input type="text" value={form.marca} onChange={f('marca')} placeholder="Ej: Carrier" {...inputProps} />
      </div>
      <div>
        <label className={lbl} style={{ color: 'var(--text-muted)' }}>Modelo</label>
        <input type="text" value={form.modelo} onChange={f('modelo')} placeholder="Ej: 40QAB024" {...inputProps} />
      </div>
      <div>
        <label className={lbl} style={{ color: 'var(--text-muted)' }}>N° Serie Equipo</label>
        <input type="text" value={form.numSerieEq} onChange={f('numSerieEq')} placeholder="SN-123456" {...inputProps} />
      </div>
      <div>
        <label className={lbl} style={{ color: 'var(--text-muted)' }}>Folio SSM</label>
        <input type="text" value={form.folioSsm} onChange={f('folioSsm')} placeholder="SSM-0001" {...inputProps} />
      </div>
      <div className="sm:col-span-2">
        <label className={lbl} style={{ color: 'var(--text-muted)' }}>Ubicación</label>
        <input type="text" value={form.ubicacion} onChange={f('ubicacion')} placeholder="Ej: Piso 3, Sala de Servidores" {...inputProps} />
      </div>
    </div>
  );
}

function SectionManager({ sections }: { sections: Section[] }) {
  const [newForm, setNewForm] = useState(SECTION_EMPTY);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editForm, setEditForm] = useState(SECTION_EMPTY);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim()) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'sections'), { ...newForm, createdAt: new Date().toISOString() });
      setNewForm(SECTION_EMPTY);
    } catch (_err) { alert("Error al guardar la sección."); }
    setIsSaving(false);
  };

  const openEdit = (s: Section) => {
    setEditingSection(s);
    setEditForm({ name: s.name || '', type: (s.type || 'preventivo') as 'preventivo' | 'diagnostico', client: s.client || '', direccion: s.direccion || '', contrato: s.contrato || '', partida: s.partida || '', equipo: s.equipo || '', marca: s.marca || '', modelo: s.modelo || '', numSerieEq: s.numSerieEq || '', folioSsm: s.folioSsm || '', ubicacion: s.ubicacion || '' });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection || !editForm.name.trim()) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'sections', editingSection.id), { ...editForm });
      setEditingSection(null);
    } catch (_err) { alert("Error al actualizar la sección."); }
    setIsUpdating(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la carpeta "${name}"?\n\nLos reportes guardados en ella no se borrarán.`)) return;
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, 'sections', id));
    } catch (_err) { alert("Error al eliminar la sección."); }
    setIsDeleting(null);
  };

  return (
    <div className="max-w-4xl animate-in fade-in">
      <div className="pb-5 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Gestión de Carpetas</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Diseña la estructura de almacenamiento para tus técnicos.</p>
      </div>

      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-4 mb-10 p-6 rounded-2xl"
        style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}
      >
        <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--accent)' }}>
          <Plus className="w-4 h-4" /> Nueva Carpeta
        </h3>
        <SectionFormFields form={newForm} setForm={setNewForm} />
        <button
          type="submit"
          disabled={isSaving}
          className="px-8 py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-200 mt-1"
          style={{ backgroundColor: 'var(--accent)', color: '#fff', opacity: isSaving ? 0.7 : 1 }}
          onMouseEnter={e => { if (!isSaving) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)'; }}
        >
          <Plus className="w-5 h-5" /> {isSaving ? 'Creando...' : 'Crear Carpeta'}
        </button>
      </form>

      <h3 className="font-bold mb-4 text-base" style={{ color: 'var(--text-primary)' }}>Carpetas Activas</h3>
      <div className="grid grid-cols-1 gap-3">
        {sections.map((s: Section) => (
          <div
            key={s.id}
            className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
              <FolderPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase"
                  style={s.type === 'diagnostico'
                    ? { backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }
                    : { backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                >
                  {s.type === 'diagnostico' ? 'Diagnóstico' : 'Preventivo'}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                {s.client && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.client}</span>}
                {s.equipo && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.equipo}</span>}
                {s.contrato && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Contrato: {s.contrato}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => openEdit(s)}
                className="p-2 rounded-lg transition-all duration-200"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-card)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(s.id, s.name)}
                disabled={isDeleting === s.id}
                className="p-2 rounded-lg transition-all duration-200 disabled:opacity-50"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--danger-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-card)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <p className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>No hay carpetas creadas aún.</p>
        )}
      </div>

      {/* Edit modal */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex justify-between items-center p-8 sticky top-0 rounded-t-3xl" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Editar Carpeta</h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{editingSection.name}</p>
              </div>
              <button
                onClick={() => setEditingSection(null)}
                className="p-2 rounded-xl transition-all duration-200"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-8 flex flex-col gap-4">
              <SectionFormFields form={editForm} setForm={setEditForm} />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff', opacity: isUpdating ? 0.7 : 1 }}
                >
                  <Save className="w-4 h-4" /> {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User Manager ─────────────────────────────────────────────────────────────

function UserManager({ users }: { users: User[] }) {
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'job' });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<(User & { phone?: string }) | null>(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', phone: '', role: 'job' });
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'users'), { ...formData, createdAt: new Date().toISOString() });
      setFormData({ name: '', username: '', password: '', role: 'job' });
      alert("Ficha de usuario guardada en la base de datos.");
    } catch (_err) { alert("Error al guardar el usuario."); }
    setIsSaving(false);
  };

  const openEditUser = (u: User) => {
    setEditingUser(u as User & { phone?: string });
    setEditForm({
      name: u.name || '',
      username: u.username || '',
      phone: (u as User & { phone?: string }).phone || '',
      role: u.role || 'job',
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        name: editForm.name,
        username: editForm.username,
        phone: editForm.phone,
        role: editForm.role,
      });
      setEditingUser(null);
    } catch (_err) { alert("Error al actualizar el usuario."); }
    setIsUpdating(false);
  };

  const inputCls = "w-full rounded-xl px-4 py-3 outline-none text-sm transition-all duration-200";
  const inputStyle = { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = 'var(--accent)');
  const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = 'var(--border)');
  const lbl = "block text-xs font-semibold uppercase tracking-wider mb-2";

  return (
    <div className="max-w-5xl animate-in fade-in">
      <div className="pb-5 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Cuentas y Accesos</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Registra los datos de tu equipo. (Recuerda darlos de alta en Firebase Authentication).</p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12 p-6 md:p-8 rounded-2xl"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <div className="md:col-span-3 mb-2">
          <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Plus className="w-5 h-5" style={{ color: 'var(--accent)' }} /> Registrar Nuevo Empleado
          </h3>
        </div>

        <div>
          <label className={lbl} style={{ color: 'var(--text-muted)' }}>Nombre Completo</label>
          <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputCls} style={inputStyle} placeholder="Ej. Juan Pérez" onFocus={inputFocus} onBlur={inputBlur} />
        </div>

        <div>
          <label className={lbl} style={{ color: 'var(--text-muted)' }}>Correo Electrónico</label>
          <input type="email" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className={inputCls} style={inputStyle} placeholder="juan@empresa.com" onFocus={inputFocus} onBlur={inputBlur} />
        </div>

        <div>
          <label className={lbl} style={{ color: 'var(--text-muted)' }}>Contraseña Asignada</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className={inputCls + " pr-12"}
              style={inputStyle}
              placeholder="••••••••"
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 transition-colors duration-200" style={{ color: 'var(--text-muted)' }}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className={lbl} style={{ color: 'var(--text-muted)' }}>Nivel de Permisos</label>
          <select
            value={formData.role}
            onChange={e => setFormData({ ...formData, role: e.target.value })}
            className={inputCls + " cursor-pointer"}
            style={inputStyle}
            onFocus={inputFocus}
            onBlur={inputBlur}
          >
            <option value="job">Técnico de Campo (Job) — Solo reportes</option>
            <option value="admin">Administrador — Acceso total</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 rounded-xl font-bold transition-all duration-200"
            style={{ backgroundColor: 'var(--accent)', color: '#fff', opacity: isSaving ? 0.7 : 1 }}
            onMouseEnter={e => { if (!isSaving) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)'; }}
          >
            {isSaving ? 'Guardando...' : 'Crear Usuario'}
          </button>
        </div>
      </form>

      <h3 className="font-bold mb-4 text-base" style={{ color: 'var(--text-primary)' }}>Directorio de Personal</h3>
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Nombre Completo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Correo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Contraseña</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Rol</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: User) => (
                <tr
                  key={u.id}
                  style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                        style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
                      >
                        {(u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{u.username}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{u.password || '••••••••'}</td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                      style={
                        u.role === 'admin'
                          ? { backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }
                          : { backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)' }
                      }
                    >
                      {u.role === 'admin' ? 'Admin' : 'Técnico'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openEditUser(u)}
                      className="p-2 rounded-lg transition-all duration-200"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-tertiary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                      title="Editar usuario"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {(users?.length || 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No hay usuarios registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit user modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex justify-between items-center p-8" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Editar Usuario</h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{editingUser.name}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-xl transition-all duration-200"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-8 space-y-4">
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Nombre Completo</label>
                <input type="text" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} style={{ ...inputStyle }} placeholder="Nombre completo" onFocus={inputFocus} onBlur={inputBlur} />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Correo Electrónico</label>
                <input type="email" required value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} className={inputCls} style={{ ...inputStyle }} placeholder="correo@empresa.com" onFocus={inputFocus} onBlur={inputBlur} />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Teléfono</label>
                <input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className={inputCls} style={{ ...inputStyle }} placeholder="+52 555 000 0000" onFocus={inputFocus} onBlur={inputBlur} />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Rol</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  className={inputCls + " cursor-pointer"}
                  style={{ ...inputStyle }}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                >
                  <option value="job">Técnico de Campo (Job)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff', opacity: isUpdating ? 0.7 : 1 }}
                >
                  <Save className="w-4 h-4" /> {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Torre Wizard ─────────────────────────────────────────────────────────────

type TorreFormData = {
  sectionId: string;
  serial: string;
  date: string;
  client: string;
  direccion: string;
  contrato: string;
  partida: string;
  subpartida: string;
  tipoServicio: 'preventivo' | 'correctivo' | 'diagnostico' | 'garantia' | 'instalacion' | 'capacitacion';
  equipo: string;
  marca: string;
  modelo: string;
  numSerie: string;
  ubicacion: string;
  falla: string;
  condiciones: string;
  trabajos: string;
  refacciones: string;
  medicion: { equipo: string; marca: string; modelo: string; serie: string }[];
  tecnico: string;
  firmaCoordinador: string;
  firmaVobo: string;
  firmaAdministrador: string;
  selloUnidad: string;
  checklist1: boolean[];
  checklist2: boolean[];
  fotos: Record<string, string>;
};

function buildInitialTorre(init?: (Report & Partial<ReportTorre>), type?: string, defaultSectionId?: string): TorreFormData {
  const d = init as Record<string, unknown> | undefined;
  return {
    sectionId: (d?.sectionId as string) || defaultSectionId || '',
    serial: (d?.serial as string) || '',
    date: (d?.date as string) || new Date().toISOString().split('T')[0],
    client: (d?.client as string) || '',
    direccion: (d?.direccion as string) || '',
    contrato: (d?.contrato as string) || '',
    partida: (d?.partida as string) || '',
    subpartida: (d?.subpartida as string) || '',
    tipoServicio: (d?.tipoServicio as TorreFormData['tipoServicio']) || (type === 'diagnostico' ? 'diagnostico' : 'preventivo'),
    equipo: (d?.equipo as string) || '',
    marca: (d?.marca as string) || '',
    modelo: (d?.modelo as string) || '',
    numSerie: (d?.numSerie as string) || '',
    ubicacion: (d?.ubicacion as string) || '',
    falla: (d?.falla as string) || '',
    condiciones: (d?.condiciones as string) || '',
    trabajos: (d?.trabajos as string) || (d?.description as string) || '',
    refacciones: (d?.refacciones as string) || '',
    medicion: (d?.medicion as TorreFormData['medicion']) || Array(6).fill(null).map(() => ({ equipo: '', marca: '', modelo: '', serie: '' })),
    tecnico: (d?.tecnico as string) || '',
    firmaCoordinador: (d?.firmaCoordinador as string) || '',
    firmaVobo: (d?.firmaVobo as string) || '',
    firmaAdministrador: (d?.firmaAdministrador as string) || '',
    selloUnidad: (d?.selloUnidad as string) || '',
    checklist1: (d?.checklist1 as boolean[]) || Array(18).fill(false),
    checklist2: (d?.checklist2 as boolean[]) || Array(12).fill(false),
    fotos: (d?.fotos as Record<string, string>) || {},
  };
}

interface TorreWizardProps {
  type: 'preventivo' | 'diagnostico';
  sections: Section[];
  currentUser: User;
  onCancel: () => void;
  initialData?: Report & Partial<ReportTorre>;
  defaultSectionId?: string;
}

function TorreWizard({ type, sections, currentUser, onCancel, initialData, defaultSectionId }: TorreWizardProps) {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [sectionSearch, setSectionSearch] = useState('');
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [fd, setFd] = useState<TorreFormData>(() => buildInitialTorre(initialData, type, defaultSectionId));

  const upd = (k: keyof TorreFormData, v: unknown) => setFd(prev => ({ ...prev, [k]: v }));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
        else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        setFd(prev => ({ ...prev, fotos: { ...prev.fotos, [key]: b64 } }));
      };
      if (typeof ev.target?.result === 'string') img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!fd.serial.trim()) return alert('El folio es obligatorio.');
    if (!fd.client.trim()) return alert('El cliente es obligatorio.');
    if (!fd.sectionId) return alert('Selecciona una carpeta.');
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const docData = {
        type, serial: fd.serial.trim().slice(0, 20),
        date: fd.date, client: fd.client.trim().slice(0, 100),
        direccion: fd.direccion.trim().slice(0, 150), contrato: fd.contrato.trim().slice(0, 50),
        partida: fd.partida.trim().slice(0, 50), subpartida: fd.subpartida.trim().slice(0, 50),
        tipoServicio: fd.tipoServicio,
        equipo: fd.equipo.trim().slice(0, 50), marca: fd.marca.trim().slice(0, 50),
        modelo: fd.modelo.trim().slice(0, 50), numSerie: fd.numSerie.trim().slice(0, 50),
        ubicacion: fd.ubicacion.trim().slice(0, 50), falla: fd.falla.trim().slice(0, 200),
        condiciones: fd.condiciones.trim().slice(0, 100), trabajos: fd.trabajos.trim().slice(0, 1698),
        refacciones: fd.refacciones.trim().slice(0, 200),
        medicion: fd.medicion,
        tecnico: fd.tecnico.trim().slice(0, 100),
        firmaCoordinador: fd.firmaCoordinador.trim().slice(0, 100),
        firmaVobo: fd.firmaVobo.trim().slice(0, 100),
        firmaAdministrador: fd.firmaAdministrador.trim().slice(0, 100),
        selloUnidad: fd.selloUnidad.trim().slice(0, 100),
        checklist1: fd.checklist1, checklist2: fd.checklist2,
        fotos: fd.fotos, sectionId: fd.sectionId,
        jobId: currentUser.id, jobName: currentUser.name || currentUser.username,
        updatedAt: now,
      };
      if (initialData?.id) {
        await updateDoc(doc(db, 'reports', initialData.id), docData);
        alert('Reporte actualizado correctamente.');
      } else {
        await addDoc(collection(db, 'reports'), { ...docData, createdAt: now });
        alert('Reporte guardado correctamente.');
      }
      onCancel();
    } catch (_e) { alert('Error al guardar. Intenta de nuevo.'); }
    setIsSaving(false);
  };

  const handleGenerarPDF = async () => {
    if (!fd.serial.trim()) return alert('Ingresa el folio antes de generar el PDF.');
    setIsGeneratingPDF(true);
    try {
      const excelBuffer = type === 'diagnostico'
        ? await generarDiagnosticoTorreBuffer(fd)
        : await generarMhosA0143Buffer(fd);
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const form = new FormData();
      form.append('file', blob, 'temp.xlsx');
      alert('Generando PDF con LibreOffice… esto puede tomar unos segundos.');
      const res = await fetch('/api/convert-to-pdf', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Conversión fallida');
      const pdfBlob = await res.blob();
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url; a.download = `${fd.serial || 'reporte'}_Impresion.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch (_e) { alert('Error al generar PDF.'); }
    setIsGeneratingPDF(false);
  };

  const taStyle = { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
  const inCls = 'w-full rounded-xl px-4 py-3 outline-none text-sm transition-all duration-200';
  const lbl = 'block text-xs font-semibold uppercase tracking-wider mb-2';
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = 'var(--accent)');
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = 'var(--border)');

  const stepLabels = type === 'preventivo'
    ? ['Datos del Reporte', 'Checklists y Fotos']
    : ['Datos del Reporte'];

  const isEditing = !!initialData?.id;
  const titleLabel = type === 'preventivo' ? 'Reporte Preventivo (MHOS-A0143)' : 'Reporte de Diagnóstico';

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-5 gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            {isEditing ? `Editando: ${initialData?.serial}` : titleLabel}
          </h2>
          <div className="flex items-center gap-1">
            {[1, 2].map(n => {
              const done = step > n; const active = step === n;
              return (
                <div key={n} className="flex items-center gap-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200"
                    style={{ backgroundColor: done ? 'var(--success)' : active ? 'var(--accent)' : 'transparent', border: `2px solid ${done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--border-strong)'}`, color: done || active ? '#fff' : 'var(--text-muted)' }}>
                    {done ? <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : n}
                  </div>
                  {n < 2 && <div className="w-10 h-0.5" style={{ backgroundColor: step > n ? 'var(--success)' : 'var(--border)' }} />}
                </div>
              );
            })}
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{stepLabels[step - 1]}</span>
          </div>
        </div>
        <button onClick={onCancel} className="text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200"
          style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--danger-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; }}>
          Cancelar
        </button>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-8">
          {/* Carpeta */}
          <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
            <label className="block text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
              <FolderPlus className="w-4 h-4" /> Carpeta (Obligatorio)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input type="text"
                value={showSectionDropdown ? sectionSearch : (sections.find(s => s.id === fd.sectionId)?.name || '')}
                onChange={e => { setSectionSearch(e.target.value); setShowSectionDropdown(true); }}
                onFocus={() => { setSectionSearch(''); setShowSectionDropdown(true); }}
                onBlur={() => setTimeout(() => setShowSectionDropdown(false), 150)}
                placeholder="Buscar carpeta..." className="w-full pl-9 pr-4 py-3 rounded-xl outline-none text-sm"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-border)', color: 'var(--text-primary)' }} />
              {showSectionDropdown && (
                <div className="absolute z-10 w-full mt-1 rounded-xl shadow-2xl max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {sections.filter(s => s.name.toLowerCase().includes(sectionSearch.toLowerCase())).map(s => (
                    <button key={s.id} type="button"
                      onMouseDown={() => {
                        setFd(prev => ({ ...prev, sectionId: s.id, client: s.client || prev.client, direccion: s.direccion || prev.direccion, contrato: s.contrato || prev.contrato, partida: s.partida || prev.partida, equipo: s.equipo || prev.equipo, marca: s.marca || prev.marca, modelo: s.modelo || prev.modelo, numSerie: s.numSerieEq || prev.numSerie, ubicacion: s.ubicacion || prev.ubicacion }));
                        setSectionSearch(''); setShowSectionDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium transition-colors duration-200"
                      style={{ backgroundColor: fd.sectionId === s.id ? 'var(--accent-light)' : 'transparent', color: fd.sectionId === s.id ? 'var(--accent)' : 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                      <span className="block">{s.name}</span>
                      {s.client && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.client}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Encabezado */}
          <div>
            <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Encabezado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Folio / Orden de Servicio (Obligatorio, max 20)</label>
                <input type="text" maxLength={20} value={fd.serial} onChange={e => upd('serial', e.target.value)} className={inCls} style={taStyle} onFocus={onFocus} onBlur={onBlur} placeholder="Ej. OS-2024-001" />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Fecha</label>
                <input type="date" value={fd.date} onChange={e => upd('date', e.target.value)} className={inCls} style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div className="md:col-span-2">
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Cliente (Obligatorio, max 100)</label>
                <input type="text" maxLength={100} value={fd.client} onChange={e => upd('client', e.target.value)} className={inCls} style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div className="md:col-span-2">
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Dirección (max 150)</label>
                <input type="text" maxLength={150} value={fd.direccion} onChange={e => upd('direccion', e.target.value)} className={inCls} style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>N° Contrato (max 50)</label>
                <input type="text" maxLength={50} value={fd.contrato} onChange={e => upd('contrato', e.target.value)} className={inCls} style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Tipo de Servicio</label>
                <input
                  type="text"
                  value={fd.tipoServicio.charAt(0).toUpperCase() + fd.tipoServicio.slice(1)}
                  readOnly
                  className={inCls}
                  style={{ ...taStyle, opacity: 0.7, cursor: 'default' }}
                />
              </div>
            </div>
          </div>

          {/* Equipo */}
          <div>
            <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Datos del Equipo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Equipo (max 50)</label>
                <input type="text" maxLength={50} value={fd.equipo} onChange={e => upd('equipo', e.target.value)} className={inCls} style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Marca (max 50)</label>
                <input type="text" maxLength={50} value={fd.marca} onChange={e => upd('marca', e.target.value)} className={inCls} style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Modelo (max 50)</label>
                <input type="text" maxLength={50} value={fd.modelo} onChange={e => upd('modelo', e.target.value)} className={inCls} style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Número de Serie (max 50)</label>
                <input type="text" maxLength={50} value={fd.numSerie} onChange={e => upd('numSerie', e.target.value)} className={inCls} style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Ubicación (max 50)</label>
                <input type="text" maxLength={50} value={fd.ubicacion} onChange={e => upd('ubicacion', e.target.value)} className={inCls} style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>
          </div>

          {/* Cuerpo */}
          <div>
            <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Reporte de Servicio</h3>
            <div className="space-y-4">
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Falla Reportada (max 200)</label>
                <textarea rows={2} maxLength={200} value={fd.falla} onChange={e => upd('falla', e.target.value)} className="w-full rounded-xl p-3 text-sm outline-none transition-all duration-200" style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Condiciones Iniciales (max 100)</label>
                <textarea rows={2} maxLength={100} value={fd.condiciones} onChange={e => upd('condiciones', e.target.value)} className="w-full rounded-xl p-3 text-sm outline-none transition-all duration-200" style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Descripción del Mantenimiento (max 1698)</label>
                <textarea rows={5} maxLength={1698} value={fd.trabajos} onChange={e => upd('trabajos', e.target.value)} className="w-full rounded-xl p-3 text-sm outline-none transition-all duration-200" style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Refacciones / Accesorios (max 200)</label>
                <textarea rows={2} maxLength={200} value={fd.refacciones} onChange={e => upd('refacciones', e.target.value)} className="w-full rounded-xl p-3 text-sm outline-none transition-all duration-200" style={taStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>
          </div>

          {/* Medición */}
          <div>
            <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Equipo de Medición (hasta 6)</h3>
            <div className="space-y-2">
              {fd.medicion.map((med, i) => (
                <div key={i} className="grid grid-cols-4 gap-2">
                  {(['equipo', 'marca', 'modelo', 'serie'] as const).map(field => (
                    <input key={field} type="text" placeholder={field === 'serie' ? 'N° Serie' : field.charAt(0).toUpperCase() + field.slice(1)} value={med[field]}
                      onChange={e => { const nm = fd.medicion.map((m, idx) => idx === i ? { ...m, [field]: e.target.value } : m); upd('medicion', nm); }}
                      className="rounded-lg px-3 py-2 text-xs outline-none transition-all duration-200" style={taStyle} onFocus={onFocus} onBlur={onBlur} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* Firmas */}
          <div>
            <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Firmas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Tec./Ing. De Servicio (automático)</label>
                <input
                  type="text"
                  value={fd.tecnico || currentUser.name || currentUser.username || ''}
                  readOnly
                  className={inCls}
                  style={{ ...taStyle, opacity: 0.7, cursor: 'default' }}
                />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Coordinador de Servicio</label>
                <input
                  type="text"
                  value={fd.firmaCoordinador || ''}
                  onChange={e => upd('firmaCoordinador', e.target.value)}
                  className={inCls}
                  style={taStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="Nombre del Coordinador"
                />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Vo.Bo. Entidad Responsable</label>
                <input
                  type="text"
                  value={fd.firmaVobo || ''}
                  onChange={e => upd('firmaVobo', e.target.value)}
                  className={inCls}
                  style={taStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="Nombre Vo.Bo."
                />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Administrador/Responsable de la Unidad</label>
                <input
                  type="text"
                  value={fd.firmaAdministrador || ''}
                  onChange={e => upd('firmaAdministrador', e.target.value)}
                  className={inCls}
                  style={taStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="Nombre del Administrador"
                />
              </div>
              <div>
                <label className={lbl} style={{ color: 'var(--text-muted)' }}>Sello de la Unidad</label>
                <input
                  type="text"
                  value={fd.selloUnidad || ''}
                  onChange={e => upd('selloUnidad', e.target.value)}
                  className={inCls}
                  style={taStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="Sello de la Unidad"
                />
              </div>
            </div>
          </div>

          {type === 'diagnostico' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={handleSave} disabled={isSaving}
                className="flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200"
                style={{ backgroundColor: 'var(--success)', color: '#fff', opacity: isSaving ? 0.7 : 1 }}>
                <Save className="w-5 h-5" /> {isSaving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Guardar en Firebase'}
              </button>
              <button onClick={handleGenerarPDF} disabled={isGeneratingPDF}
                className="flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200"
                style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)', opacity: isGeneratingPDF ? 0.7 : 1 }}
                onMouseEnter={e => { if (!isGeneratingPDF) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--danger-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; }}>
                <Printer className="w-5 h-5" /> {isGeneratingPDF ? 'Generando...' : 'Generar PDF'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-8">
          {type === 'preventivo' && (
            <>
              {/* Checklist 1 */}
              <div>
                <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Check List 1 (18 actividades)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  {fd.checklist1.map((checked, i) => (
                    <label key={i} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200" style={{ border: '1px solid transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                      <div className="relative shrink-0">
                        <input type="checkbox" checked={checked} onChange={e => { const n = [...fd.checklist1]; n[i] = e.target.checked; upd('checklist1', n); }} className="sr-only" />
                        <div className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200"
                          style={{ backgroundColor: checked ? 'var(--success)' : 'transparent', border: `2px solid ${checked ? 'var(--success)' : 'var(--border-strong)'}` }}>
                          {checked && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Actividad {i + 1}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Checklist 2 */}
              <div>
                <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Check List 2 (12 actividades)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  {fd.checklist2.map((checked, i) => (
                    <label key={i} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200" style={{ border: '1px solid transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                      <div className="relative shrink-0">
                        <input type="checkbox" checked={checked} onChange={e => { const n = [...fd.checklist2]; n[i] = e.target.checked; upd('checklist2', n); }} className="sr-only" />
                        <div className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200"
                          style={{ backgroundColor: checked ? 'var(--success)' : 'transparent', border: `2px solid ${checked ? 'var(--success)' : 'var(--border-strong)'}` }}>
                          {checked && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Actividad {i + 1}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Fotos */}
          <div>
            <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Evidencia Fotográfica</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['antes1','antes2','antes3','durante1','durante2','despues1','despues2'] as const).map(key => (
                <div key={key} className="relative h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-200"
                  style={{ borderColor: fd.fotos[key] ? 'var(--success)' : 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                  {fd.fotos[key] ? (
                    <div className="flex flex-col items-center" style={{ color: 'var(--success)' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: 'var(--success-light)' }}>
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold">¡Lista!</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center" style={{ color: 'var(--text-muted)' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium capitalize">{key.replace(/(\d)/, ' $1')}</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, key)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={handleSave} disabled={isSaving}
              className="flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200"
              style={{ backgroundColor: 'var(--success)', color: '#fff', opacity: isSaving ? 0.7 : 1 }}>
              <Save className="w-5 h-5" /> {isSaving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Guardar en Firebase'}
            </button>
            <button onClick={handleGenerarPDF} disabled={isGeneratingPDF}
              className="flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200"
              style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)', opacity: isGeneratingPDF ? 0.7 : 1 }}
              onMouseEnter={e => { if (!isGeneratingPDF) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--danger-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; }}>
              <Printer className="w-5 h-5" /> {isGeneratingPDF ? 'Generando...' : 'Generar PDF'}
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-8 mt-8" style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={() => setStep(step - 1)} disabled={step === 1}
          className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-0"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          Atrás
        </button>
        {step < 2 && type === 'preventivo' && (
          <button onClick={() => setStep(2)}
            className="px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)'}>
            Siguiente →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Admin Report Wizard ──────────────────────────────────────────────────────

interface AdminJobWizardProps {
  type: string;
  sections: Section[];
  currentUser: User;
  onCancel: () => void;
}

const InputRow = ({ label, value, onChange, span = 1 }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; span?: number }) => (
  <div className={`col-span-${span}`}>
    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</label>
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

function AdminJobWizard({ type, sections, currentUser, onCancel }: AdminJobWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [sectionSearch, setSectionSearch] = useState<string>('');
  const [showSectionDropdown, setShowSectionDropdown] = useState<boolean>(false);

  const [data, setData] = useState({
    sectionId: '', client: '', direccion: '', contrato: '', partida: '',
    equipo: '', marca: '', modelo: '', numSerieEq: '', folioSsm: '', ubicacion: '',
    falla: '', condiciones: '', trabajos: '',
    refacciones: ['', '', '', ''],
    medicion: [{ equipo: '', marca: '', modelo: '', serie: '' }, { equipo: '', marca: '', modelo: '', serie: '' }, { equipo: '', marca: '', modelo: '', serie: '' }],
    checklist: Array(28).fill(false),
    firmaEntrega: currentUser.name || '', firmaRecibe: '', firmaValida: '',
    fotos: { antes1: '', antes2: '', antes3: '', durante1: '', durante2: '', despues1: '', despues2: '', etiqueta: '' } as Record<string, string>
  });

  const LISTA_CHECKLIST = [
    "Aire de 1 y 2 Toneladas", "Verificación visual", "Pruebas previas", "Alarmas y control", "Conexión a tierra",
    "Limpieza gabinete", "Mant. condensador", "Retirar materiales", "Alineación serpentín", "Lavado con químicos",
    "Tableta charola", "Mant. compresor", "Mant. ventilador", "Mant. evaporador", "Válvula expansión",
    "Carga refrigerante", "Arranque compresor", "Sensor temperatura", "Calibración control", "Amperaje y sobrecarga",
    "Limpieza general", "Reemplazo filtros", "Motores extractores", "Motores inyectores", "Bandas y aspiradores",
    "Puesta en marcha", "Verificar funcionamiento", "Pruebas de esfuerzo"
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
    if (!data.sectionId || !data.client) return alert("Llena al menos la Carpeta y el Cliente en la Página 1");
    setIsSaving(true);
    try {
      const snapshot = await getDocs(collection(db, 'reports'));
      const count = snapshot.size + 1;
      const serial = `MHOS-SSM-EL-${String(count).padStart(4, '0')}`;
      const finalReport = {
        serial, type: (type || 'preventivo').toLowerCase(),
        jobId: currentUser.id, jobName: currentUser.name || currentUser.username,
        date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString(),
        ...data
      };
      await addDoc(collection(db, 'reports'), finalReport);
      await generarExcel(finalReport);
      alert(`¡Reporte Creado Exitosamente!\nFolio: ${serial}\nEl Excel se ha descargado.`);
      onCancel();
    } catch (_err) { alert("Error al guardar en la nube. Intenta de nuevo."); }
    setIsSaving(false);
  };

  const pageTitles = ["Página 1: Generales y Equipo", "Página 2: Rutina Anexo Técnico (Checklist)", "Página 3: Evidencia Fotográfica"];
  const taStyle = { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-5 gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{pageTitles[step - 1]}</h2>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map(n => {
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
                  {n < 3 && (
                    <div className="w-10 h-0.5 transition-all duration-200" style={{ backgroundColor: step > n ? 'var(--success)' : 'var(--border)' }} />
                  )}
                </div>
              );
            })}
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>Paso {step} de 3</span>
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

            <div>
              <h3 className="font-bold pb-2 mb-4 text-lg" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Datos Generales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputRow label="Cliente (Obligatorio)" value={data.client} onChange={e => setData({ ...data, client: e.target.value })} span={2} />
                <InputRow label="Dirección" value={data.direccion} onChange={e => setData({ ...data, direccion: e.target.value })} span={2} />
                <InputRow label="N° Contrato" value={data.contrato} onChange={e => setData({ ...data, contrato: e.target.value })} />
                <InputRow label="Partida" value={data.partida} onChange={e => setData({ ...data, partida: e.target.value })} />
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

        {step === 2 && (
          <div className="animate-in fade-in space-y-5">
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                Marca las casillas de las acciones que realizaste. En el Excel aparecerá automáticamente una &quot;X&quot; en negritas.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              {LISTA_CHECKLIST.map((item, index) => (
                <label
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200"
                  style={{ border: '1px solid transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                >
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={data.checklist[index]}
                      onChange={e => {
                        const newChecks = [...data.checklist]; newChecks[index] = e.target.checked;
                        setData({ ...data, checklist: newChecks });
                      }}
                      className="sr-only"
                    />
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200"
                      style={{
                        backgroundColor: data.checklist[index] ? 'var(--success)' : 'transparent',
                        border: `2px solid ${data.checklist[index] ? 'var(--success)' : 'var(--border-strong)'}`,
                      }}
                    >
                      {data.checklist[index] && (
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm leading-tight pt-0.5" style={{ color: data.checklist[index] ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-in fade-in">
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--warning-light)', border: '1px solid var(--warning)' }}>
              <h3 className="font-bold text-base mb-1" style={{ color: 'var(--warning)' }}>Evidencia Fotográfica</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sube las fotos desde tu celular. El sistema las comprimirá y acomodará en la Página 3 del Excel.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'antes1', label: 'Antes 1' }, { key: 'antes2', label: 'Antes 2' }, { key: 'antes3', label: 'Antes 3' },
                { key: 'durante1', label: 'Durante 1' }, { key: 'durante2', label: 'Durante 2' }, { key: 'etiqueta', label: 'Etiqueta' },
                { key: 'despues1', label: 'Después 1' }, { key: 'despues2', label: 'Después 2' }
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

        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          >
            Siguiente Página →
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-4 rounded-xl font-bold text-base flex items-center gap-2 transition-all duration-200"
            style={{ backgroundColor: 'var(--success)', color: '#fff', opacity: isSaving ? 0.7 : 1 }}
          >
            {isSaving ? 'Guardando Reporte...' : <><Save className="w-5 h-5" /> Terminar y Descargar Excel</>}
          </button>
        )}
      </div>
    </div>
  );
}
