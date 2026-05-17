import React, { useState } from 'react';
import { FileSpreadsheet, MessageSquare } from 'lucide-react';
import ChatSystem from './ChatSystem';
import { TorreWizard } from './AdminDashboard';
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

type WorkerReportType = 'preventivo' | 'diagnostico';

export default function JobDashboard({ sections, messages, setMessages, currentUser, adminUsers, activeTab, setActiveTab }: JobProps) {
  const [reportType, setReportType] = useState<WorkerReportType>('preventivo');

  const startReport = (type: WorkerReportType) => {
    setReportType(type);
    setActiveTab('form');
  };

  const reportCards = [
    { type: 'preventivo' as const, label: 'Reporte Preventivo', accent: 'var(--accent)', light: 'var(--accent-light)', border: 'var(--accent-border)' },
    { type: 'diagnostico' as const, label: 'Reporte de Diagnostico', accent: 'var(--warning)', light: 'var(--warning-light)', border: 'var(--warning)' },
  ];

  return (
    <div className="space-y-5">
      {activeTab === 'menu' && (
        <div className="rounded-2xl p-5 md:p-8 min-h-[600px]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div className="flex flex-col items-center py-12 animate-in fade-in">
            <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Formato de Servicio</h2>
            <p className="text-sm mb-10" style={{ color: 'var(--text-secondary)' }}>Selecciona el tipo de reporte para comenzar a llenarlo.</p>
            <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-5">
              {reportCards.map(card => (
                <button
                  key={card.type}
                  onClick={() => startReport(card.type)}
                  className="w-full flex flex-col items-center justify-center p-10 rounded-3xl transition-all duration-200 hover:scale-[1.02]"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-lg)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = card.border;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-md)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  }}
                >
                  <div className="p-5 rounded-2xl mb-5" style={{ backgroundColor: card.light }}>
                    <FileSpreadsheet className="w-12 h-12" style={{ color: card.accent }} />
                  </div>
                  <span className="text-2xl font-bold mb-3 text-center" style={{ color: 'var(--text-primary)' }}>{card.label}</span>
                  <span className="text-xs font-semibold px-4 py-1.5 rounded-full" style={{ backgroundColor: card.light, color: card.accent, border: '1px solid ' + card.border }}>
                    Automatico a PDF
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'form' && (
        <div className="rounded-2xl p-5 md:p-8 min-h-[600px]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <TorreWizard type={reportType} sections={sections} currentUser={currentUser} onCancel={() => setActiveTab('menu')} />
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="rounded-2xl p-5 md:p-8 min-h-[600px]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <ChatSystem messages={messages} setMessages={setMessages} currentUser={currentUser} allUsers={adminUsers} isJobView={true} />
        </div>
      )}

      {!['menu', 'form', 'chat'].includes(activeTab) && (
        <div className="rounded-2xl p-8 min-h-[400px] flex flex-col items-center justify-center text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <MessageSquare className="w-10 h-10 mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Modulo no disponible</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Pide al administrador que habilite el permiso correspondiente.</p>
        </div>
      )}
    </div>
  );
}
