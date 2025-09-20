import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { 
  User, 
  Doctor, 
  Appointment, 
  Schedule, 
  MedicalRecord,
  ApiResponse,
  PaginatedResponse,
  LoginRequest,
  RegisterRequest,
  AppointmentRequest,
  DoctorSearchFilters,
  AppointmentFilters,
  DashboardStats,
  AuditLog
} from '@/types';

class ApiClient {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
      withCredentials: true, // Include HTTP-only cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        this.handleApiError(error);
        return Promise.reject(new Error(error.message));
      }
    );
  }

  private handleApiError(error: AxiosError) {
    let message = 'An unexpected error occurred';
    
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as any;
      message = data.message || message;
    }

    // Show error toast for client errors
    if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
      toast.error(message);
    }

    // Handle unauthorized
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<ApiResponse<User>> {
    const response = await this.client.post('/api/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<User>> {
    const response = await this.client.post('/api/auth/register', userData);
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/logout');
    return response.data;
  }

  async refreshToken(): Promise<ApiResponse<User>> {
    const response = await this.client.post('/api/auth/refresh');
    return response.data;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.client.get('/api/auth/profile');
    return response.data;
  }

  // Doctors
  async getDoctors(filters?: DoctorSearchFilters): Promise<PaginatedResponse<Doctor>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    
    const response = await this.client.get(`/api/doctors?${params.toString()}`);
    return response.data;
  }

  async getDoctor(id: string): Promise<ApiResponse<Doctor>> {
    const response = await this.client.get(`/api/doctors/${id}`);
    return response.data;
  }

  async createDoctor(doctorData: Omit<Doctor, 'id' | 'createdAt' | 'updatedAt' | 'user'>): Promise<ApiResponse<Doctor>> {
    const response = await this.client.post('/api/doctors', doctorData);
    return response.data;
  }

  async updateDoctor(id: string, doctorData: Partial<Doctor>): Promise<ApiResponse<Doctor>> {
    const response = await this.client.put(`/api/doctors/${id}`, doctorData);
    return response.data;
  }

  async deleteDoctor(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/doctors/${id}`);
    return response.data;
  }

  // Schedules
  async getSchedules(doctorId?: string): Promise<ApiResponse<Schedule[]>> {
    const params = doctorId ? `?doctorId=${doctorId}` : '';
    const response = await this.client.get(`/api/schedules${params}`);
    return response.data;
  }

  async createSchedule(scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Schedule>> {
    const response = await this.client.post('/api/schedules', scheduleData);
    return response.data;
  }

  async updateSchedule(id: string, scheduleData: Partial<Schedule>): Promise<ApiResponse<Schedule>> {
    const response = await this.client.put(`/api/schedules/${id}`, scheduleData);
    return response.data;
  }

  async deleteSchedule(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/schedules/${id}`);
    return response.data;
  }

  // Appointments
  async getAppointments(filters?: AppointmentFilters): Promise<PaginatedResponse<Appointment>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    
    const response = await this.client.get(`/api/appointments?${params.toString()}`);
    return response.data;
  }

  async getAppointment(id: string): Promise<ApiResponse<Appointment>> {
    const response = await this.client.get(`/api/appointments/${id}`);
    return response.data;
  }

  async createAppointment(appointmentData: AppointmentRequest): Promise<ApiResponse<Appointment>> {
    const response = await this.client.post('/api/appointments', appointmentData);
    return response.data;
  }

  async updateAppointment(id: string, appointmentData: Partial<Appointment>): Promise<ApiResponse<Appointment>> {
    const response = await this.client.put(`/api/appointments/${id}`, appointmentData);
    return response.data;
  }

  async cancelAppointment(id: string): Promise<ApiResponse<Appointment>> {
    const response = await this.client.patch(`/api/appointments/${id}/cancel`);
    return response.data;
  }

  async confirmAppointment(id: string): Promise<ApiResponse<Appointment>> {
    const response = await this.client.patch(`/api/appointments/${id}/confirm`);
    return response.data;
  }

  async completeAppointment(id: string): Promise<ApiResponse<Appointment>> {
    const response = await this.client.patch(`/api/appointments/${id}/complete`);
    return response.data;
  }

  // Medical Records
  async getMedicalRecords(patientId?: string): Promise<ApiResponse<MedicalRecord[]>> {
    const params = patientId ? `?patientId=${patientId}` : '';
    const response = await this.client.get(`/api/medical-records${params}`);
    return response.data;
  }

  async getMedicalRecord(id: string): Promise<ApiResponse<MedicalRecord>> {
    const response = await this.client.get(`/api/medical-records/${id}`);
    return response.data;
  }

  async createMedicalRecord(recordData: Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<MedicalRecord>> {
    const response = await this.client.post('/api/medical-records', recordData);
    return response.data;
  }

  async updateMedicalRecord(id: string, recordData: Partial<MedicalRecord>): Promise<ApiResponse<MedicalRecord>> {
    const response = await this.client.put(`/api/medical-records/${id}`, recordData);
    return response.data;
  }

  // Analytics
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await this.client.get('/api/analytics/dashboard');
    return response.data;
  }

  async getAuditLogs(page = 1, limit = 50): Promise<PaginatedResponse<AuditLog>> {
    const response = await this.client.get(`/api/analytics/audit-logs?page=${page}&limit=${limit}`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
