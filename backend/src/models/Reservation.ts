import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ReservationAttributes {
  id: number;
  userId: number;
  vehicleId: number;
  parkingSpaceId: number;
  startTime: Date;
  endTime: Date | null;
  status: 'active' | 'occupied' | 'completed' | 'cancelled';
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationCreationAttributes extends Optional<ReservationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Reservation extends Model<ReservationAttributes, ReservationCreationAttributes> implements ReservationAttributes {
  public id!: number;
  public userId!: number;
  public vehicleId!: number;
  public parkingSpaceId!: number;
  public startTime!: Date;
  public endTime!: Date | null;
  public status!: 'active' | 'occupied' | 'completed' | 'cancelled';
  public totalAmount!: number;
  public paymentStatus!: 'pending' | 'paid' | 'refunded';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Reservation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    vehicleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'vehicles',
        key: 'id',
      },
    },
    parkingSpaceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'parking_spaces',
        key: 'id',
      },
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'occupied', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'active',
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'refunded'),
      allowNull: false,
      defaultValue: 'pending',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Reservation',
    tableName: 'reservations',
    timestamps: true,
  }
);
