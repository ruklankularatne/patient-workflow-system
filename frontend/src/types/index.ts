// User and Authentication Types
export type Role = 'superadmin' | 'admin' | 'doctor' | 'patient';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  doctorId?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  fullName: string;
  password: string;
  role?: Role;
}

export interface CreateDoctorRequest {
  email: string;
  fullName: string;
  password: string;
  specialty: string;
  location: string;
  bio?: string;
}

// Doctor Types
export interface Doctor {
  id: string;
  userId: string;
  specialty: string;
  bio?: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  user: User;
}

// Schedule Types
export interface Schedule {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  doctor?: Doctor;
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  specificDate?: string; // For specific date overrides
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
  doctor?: Doctor;
}

// Appointment Types
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  doctor?: Doctor;
  patient?: User;
  medicalRecord?: MedicalRecord;
}

export interface AppointmentRequest {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  notes?: string;
}

// Medical Record Types
export interface MedicalRecord {
  id: string;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  notes?: string;
  diagnosis?: string;
  treatment?: string;
  medications?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
  appointment?: Appointment;
  patient?: User;
  doctor?: Doctor;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form Types
export interface DoctorSearchFilters {
  specialty?: string;
  location?: string;
  search?: string;
}

export interface AppointmentFilters {
  status?: AppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
  doctorId?: string;
  patientId?: string;
}

// Dashboard Types
export interface DashboardStats {
  totalUsers: number;
  totalDoctors: number;
  totalAppointments: number;
  appointmentsToday: number;
  pendingAppointments: number;
}

// Audit Log Types
export type AuditAction = 'create' | 'update' | 'delete';

export interface AuditLog {
  id: string;
  actorUserId?: string;
  entity: string;
  entityId?: string;
  action: AuditAction;
  before?: any;
  after?: any;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
  actor?: User;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface AuthState extends LoadingState {
  user?: User;
  isAuthenticated: boolean;
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type CreateRequest<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateRequest<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;