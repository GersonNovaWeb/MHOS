export interface User {
  id: string;
  authUid?: string;
  username: string;
  password?: string;
  role: 'admin' | 'job';
  name: string;
  nickname?: string;
  phone?: string;
  photoUrl?: string;
  profileColor?: string;
  canAccessReports?: boolean;
  canManageSections?: boolean;
}

export interface Section {
  id: string;
  name: string;
  type?: 'preventivo' | 'diagnostico';
  client?: string;
  direccion?: string;
  contrato?: string;
  partida?: string;
  equipo?: string;
  marca?: string;
  modelo?: string;
  numSerieEq?: string;
  folioSsm?: string;
  ubicacion?: string;
  createdAt?: string;
}

export interface Report {
  id: string;
  serial: string;
  type: string;
  sectionId: string;
  jobId: string;
  jobName: string;
  date: string;
  client: string;
  description?: string;
  createdAt?: string;
}

export interface Message {
  id: number | string;
  senderId: string;
  receiverId: string;
  text: string;
  time: string;
  createdAt?: string;
}

export interface NotificationMsg {
  id: number;
  message: string;
  time: string;
}

export interface ReportChangeItem {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface ReportHistoryItem {
  id: string;
  reportId: string;
  serial: string;
  action: 'created' | 'edited';
  actorId: string;
  actorName: string;
  actorRole: 'admin' | 'job';
  createdAt: string;
  changes: ReportChangeItem[];
}

export interface AppNotification {
  id: string;
  type: 'report_created';
  title: string;
  message: string;
  reportId?: string;
  serial?: string;
  actorId?: string;
  actorName?: string;
  targetRole?: 'admin';
  isRead?: boolean;
  createdAt?: string;
}

export interface MedicionEquipo {
  equipo: string;
  marca: string;
  modelo: string;
  serie: string;
}

export interface ReportTorre {
  serial: string;
  date: string;
  client: string;
  direccion?: string;
  contrato?: string;
  partida?: string;
  subpartida?: string;
  equipo?: string;
  marca?: string;
  modelo?: string;
  numSerie?: string;
  ubicacion?: string;
  tipoServicio: 'preventivo' | 'correctivo' | 'diagnostico' | 'garantia' | 'instalacion' | 'capacitacion';
  falla?: string;
  condiciones?: string;
  trabajos?: string;
  refacciones?: string;
  medicion?: MedicionEquipo[];
  checklist1?: boolean[];
  checklist2?: boolean[];
  fotos?: {
    antes1?: string; antes2?: string; antes3?: string;
    durante1?: string; durante2?: string;
    despues1?: string; despues2?: string;
  };
}