import sequelize from '../config/database';
import { User } from './User';
import { Vehicle } from './Vehicle';
import { ParkingSpace } from './ParkingSpace';
import { Reservation } from './Reservation';
import { LPRRecord } from './LPRRecord';
import { Schedule } from './Schedule';
import { Payment } from './Payment';
import { CashCloseout } from './CashCloseout';

// Define associations
User.hasMany(Vehicle, { foreignKey: 'userId', as: 'vehicles' });
Vehicle.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Reservation, { foreignKey: 'userId', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Vehicle.hasMany(Reservation, { foreignKey: 'vehicleId', as: 'reservations' });
Reservation.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

Schedule.hasMany(ParkingSpace, { foreignKey: 'scheduleId', as: 'parkingSpaces' });
ParkingSpace.belongsTo(Schedule, { foreignKey: 'scheduleId', as: 'schedule' });

ParkingSpace.hasMany(Reservation, { foreignKey: 'parkingSpaceId', as: 'reservations' });
Reservation.belongsTo(ParkingSpace, { foreignKey: 'parkingSpaceId', as: 'parkingSpace' });

Reservation.hasMany(LPRRecord, { foreignKey: 'reservationId', as: 'lprRecords' });
LPRRecord.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });

Vehicle.hasMany(LPRRecord, { foreignKey: 'vehicleId', as: 'lprRecords' });
LPRRecord.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

User.hasMany(LPRRecord, { foreignKey: 'userId', as: 'lprRecords' });
LPRRecord.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(LPRRecord, { foreignKey: 'processedBy', as: 'processedLPRRecords' });
LPRRecord.belongsTo(User, { foreignKey: 'processedBy', as: 'processedByUser' });

// Cashier module associations
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });

Payment.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
Reservation.hasMany(Payment, { foreignKey: 'reservationId', as: 'payments' });

Payment.belongsTo(User, { foreignKey: 'recordedBy', as: 'recordedByUser' });
User.hasMany(Payment, { foreignKey: 'recordedBy', as: 'recordedPayments' });

Payment.belongsTo(CashCloseout, { foreignKey: 'closeoutId', as: 'closeout' });
CashCloseout.hasMany(Payment, { foreignKey: 'closeoutId', as: 'payments' });

CashCloseout.belongsTo(User, { foreignKey: 'closedBy', as: 'closedByUser' });
User.hasMany(CashCloseout, { foreignKey: 'closedBy', as: 'performedCloseouts' });

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync all models - use force: false to avoid deadlocks
    await sequelize.sync({ force: false });
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

export {
  sequelize,
  User,
  Vehicle,
  ParkingSpace,
  Reservation,
  LPRRecord,
  Schedule,
  Payment,
  CashCloseout,
  syncDatabase,
};
