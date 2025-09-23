import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { 
  User, 
  Doctor, 
  Appointment, 
  Schedule, 
  DoctorSchedule,
  MedicalRecord,
  ApiResponse,
  PaginatedResponse,
  LoginRequest,
  RegisterRequest,
  CreateDoctorRequest,
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
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
      withCredentials: true, // Include HTTP-only cookies
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout (updated)
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(new Error(error.message || 'Request failed'));
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

    // Don't show toast for auth check failures (401 on auth/me)
    const isAuthCheck = error.config?.url?.includes('auth/me');
    const isAppointmentCreation = error.config?.url?.includes('appointments') && error.config?.method === 'post';
    
    // Show error toast for client errors (but not for auth checks)
    if (error.response?.status && error.response.status >= 400 && error.response.status < 500 && !isAuthCheck) {
      toast.error(message);
    }

    // Handle unauthorized - but don't redirect for appointment creation failures
    if (error.response?.status === 401) {
      // Don't redirect for auth checks or appointment creation failures
      if (!isAuthCheck && !isAppointmentCreation) {
        window.location.href = '/login';
      }
    }
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<ApiResponse<User>> {
    const response = await this.client.post('auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<User>> {
    const response = await this.client.post('auth/register', userData);
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.client.post('auth/logout');
    return response.data;
  }

  async refreshToken(): Promise<ApiResponse<User>> {
    const response = await this.client.post('auth/refresh');
    return response.data;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.client.get('auth/me');
    return response.data;
  }

  // User Management (Admin only)
  async getUsers(): Promise<ApiResponse<User[]>> {
    const response = await this.client.get('users');
    return response.data;
  }

  async getAllUsers(): Promise<ApiResponse<User[]>> {
    const response = await this.client.get('users');
    return response.data;
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    const response = await this.client.get(`users/${id}`);
    return response.data;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.client.put(`users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`users/${id}`);
    return response.data;
  }

  async createAdmin(adminData: { email: string; fullName: string; password: string }): Promise<ApiResponse<User>> {
    const response = await this.client.post('users/create-admin', adminData);
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
    
    const response = await this.client.get(`doctors?${params.toString()}`);
    return response.data;
  }

  async getDoctor(id: string): Promise<ApiResponse<Doctor>> {
    const response = await this.client.get(`doctors/${id}`);
    return response.data;
  }

  async createDoctor(doctorData: CreateDoctorRequest): Promise<ApiResponse<Doctor>> {
    const response = await this.client.post('doctors', doctorData);
    return response.data;
  }

  async updateDoctor(id: string, doctorData: Partial<Doctor>): Promise<ApiResponse<Doctor>> {
    const response = await this.client.put(`doctors/${id}`, doctorData);
    return response.data;
  }

  async deleteDoctor(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`doctors/${id}`);
    return response.data;
  }

  // Schedules
  async getSchedules(doctorId?: string): Promise<ApiResponse<Schedule[]>> {
    const params = doctorId ? `?doctorId=${doctorId}` : '';
    const response = await this.client.get(`schedules${params}`);
    return response.data;
  }

  async getDoctorSchedules(doctorId: string): Promise<ApiResponse<DoctorSchedule[]>> {
    const response = await this.client.get(`schedules?doctorId=${doctorId}`);
    return response.data;
  }

  async createSchedule(scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Schedule>> {
    const response = await this.client.post('schedules', scheduleData);
    return response.data;
  }

  async updateSchedule(id: string, scheduleData: Partial<Schedule>): Promise<ApiResponse<Schedule>> {
    const response = await this.client.put(`schedules/${id}`, scheduleData);
    return response.data;
  }

  async deleteSchedule(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`schedules/${id}`);
    // For 204 responses, return success manually since there's no response body
    return response.status === 204 ? { success: true, message: 'Schedule deleted successfully' } : response.data;
  }

  // Appointments
  async getAppointments(filters?: AppointmentFilters): Promise<PaginatedResponse<Appointment>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    
    const response = await this.client.get(`appointments?${params.toString()}`);
    return response.data;
  }

  async getAllAppointments(): Promise<ApiResponse<Appointment[]>> {
    const response = await this.client.get('appointments');
    return response.data;
  }

  async getAppointment(id: string): Promise<ApiResponse<Appointment>> {
    const response = await this.client.get(`appointments/${id}`);
    return response.data;
  }

  async createAppointment(appointmentData: AppointmentRequest): Promise<ApiResponse<Appointment>> {
    const response = await this.client.post('appointments', appointmentData);
    return response.data;
  }

  async updateAppointment(id: string, appointmentData: Partial<Appointment>): Promise<ApiResponse<Appointment>> {
    const response = await this.client.put(`appointments/${id}`, appointmentData);
    return response.data;
  }

  async cancelAppointment(id: string): Promise<ApiResponse<Appointment>> {
    const response = await this.client.patch(`appointments/${id}/cancel`);
    return response.data;
  }

  async confirmAppointment(id: string): Promise<ApiResponse<Appointment>> {
    const response = await this.client.patch(`appointments/${id}/confirm`);
    return response.data;
  }

  async completeAppointment(id: string): Promise<ApiResponse<Appointment>> {
    const response = await this.client.patch(`appointments/${id}/complete`);
    return response.data;
  }

  // Medical Records
  async getMedicalRecords(patientId?: string): Promise<ApiResponse<MedicalRecord[]>> {
    const params = patientId ? `?patientId=${patientId}` : '';
    const url = `medical-records${params}`;
    console.log('Making request to medical records:', url);
    console.log('With patientId:', patientId);
    const response = await this.client.get(url);
    return response.data;
  }

  async getAllMedicalRecords(): Promise<ApiResponse<MedicalRecord[]>> {
    const response = await this.client.get('medical-records');
    return response.data;
  }

  async getMedicalRecordsByPatient(patientId: string): Promise<ApiResponse<MedicalRecord[]>> {
    const response = await this.client.get(`medical-records?patientId=${patientId}`);
    return response.data;
  }

  async getMedicalRecordsByAppointment(appointmentId: string): Promise<ApiResponse<MedicalRecord>> {
    const response = await this.client.get(`medical-records/appointment/${appointmentId}`);
    return response.data;
  }

  async getMedicalRecord(id: string): Promise<ApiResponse<MedicalRecord>> {
    const response = await this.client.get(`medical-records/${id}`);
    return response.data;
  }

  async getMedicalRecordByAppointment(appointmentId: string): Promise<MedicalRecord | null> {
    try {
      const response = await this.client.get(`medical-records/${appointmentId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createMedicalRecord(recordData: Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<MedicalRecord>> {
    const response = await this.client.post('medical-records', recordData);
    return response.data;
  }

  async updateMedicalRecord(id: string, recordData: Partial<MedicalRecord>): Promise<ApiResponse<MedicalRecord>> {
    const response = await this.client.put(`medical-records/${id}`, recordData);
    return response.data;
  }

  // Analytics
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await this.client.get('analytics/dashboard');
    return response.data;
  }

  async getAuditLogs(page = 1, limit = 50): Promise<PaginatedResponse<AuditLog>> {
    const response = await this.client.get(`analytics/audit-logs?page=${page}&limit=${limit}`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
