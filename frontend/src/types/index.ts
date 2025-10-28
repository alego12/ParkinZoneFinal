export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'admin' | 'security' | 'client' | 'cashier';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: number;
  userId: number;
  model: string;
  plate: string;
  color: string;
  type: 'car' | 'motorcycle';
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: number;
  name: string;
  description: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  overtimeRate: number;
  indefiniteRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingSpace {
  id: number;
  spaceNumber: string;
  zone: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  positionX: number;
  positionY: number;
  isActive: boolean;
  vehicleType: 'car' | 'motorcycle' | 'both';
  scheduleId: number;
  carRate: number;
  motorcycleRate: number;
  createdAt: string;
  updatedAt: string;
  schedule?: Schedule;
}

export interface Reservation {
  id: number;
  userId: number;
  vehicleId: number;
  parkingSpaceId: number;
  startTime: string;
  endTime: string | null;
  status: 'active' | 'occupied' | 'completed' | 'cancelled';
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
  parkingSpace?: ParkingSpace;
  user?: User;
}

export interface LPRRecord {
  id: number;
  plateNumber: string;
  vehicleColor: string;
  detectedAt: string;
  imagePath: string;
  confidence: number;
  status: 'pending' | 'matched' | 'no_match' | 'processed' | 'vehicle_created';
  reservationId?: number;
  vehicleId?: number;
  userId?: number;
  processedBy?: number;
  processedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  reservation?: Reservation;
  vehicle?: Vehicle;
  user?: User;
  processedByUser?: User;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface DashboardStats {
  users: {
    total: number;
    clients: number;
    employees: number;
  };
  parking: {
    total: number;
    available: number;
    occupied: number;
  };
  revenue: number;
}

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  [key: string]: any;
}
