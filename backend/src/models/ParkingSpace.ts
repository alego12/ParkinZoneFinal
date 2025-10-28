import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ParkingSpaceAttributes {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface ParkingSpaceCreationAttributes extends Optional<ParkingSpaceAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ParkingSpace extends Model<ParkingSpaceAttributes, ParkingSpaceCreationAttributes> implements ParkingSpaceAttributes {
  public id!: number;
  public spaceNumber!: string;
  public zone!: string;
  public status!: 'available' | 'occupied' | 'maintenance' | 'reserved';
  public positionX!: number;
  public positionY!: number;
  public isActive!: boolean;
  public vehicleType!: 'car' | 'motorcycle' | 'both';
  public scheduleId!: number;
  public carRate!: number;
  public motorcycleRate!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ParkingSpace.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    spaceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    zone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('available', 'occupied', 'maintenance', 'reserved'),
      allowNull: false,
      defaultValue: 'available',
    },
    positionX: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    positionY: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    vehicleType: {
      type: DataTypes.ENUM('car', 'motorcycle', 'both'),
      allowNull: false,
      defaultValue: 'both',
    },
    scheduleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'schedules',
        key: 'id',
      },
    },
    carRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 2.50,
    },
    motorcycleRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.50,
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
    modelName: 'ParkingSpace',
    tableName: 'parking_spaces',
    timestamps: true,
  }
);
