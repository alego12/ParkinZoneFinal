import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface LPRRecordAttributes {
  id: number;
  plateNumber: string;
  vehicleColor: string;
  detectedAt: Date;
  imagePath: string;
  confidence: number;
  status: 'pending' | 'matched' | 'no_match' | 'processed' | 'vehicle_created';
  type?: 'entry' | 'exit';
  reservationId?: number;
  vehicleId?: number;
  userId?: number;
  processedBy?: number;
  processedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LPRRecordCreationAttributes extends Optional<LPRRecordAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class LPRRecord extends Model<LPRRecordAttributes, LPRRecordCreationAttributes> implements LPRRecordAttributes {
  public id!: number;
  public plateNumber!: string;
  public vehicleColor!: string;
  public detectedAt!: Date;
  public imagePath!: string;
  public confidence!: number;
  public status!: 'pending' | 'matched' | 'no_match' | 'processed' | 'vehicle_created';
  public type?: 'entry' | 'exit';
  public reservationId?: number;
  public vehicleId?: number;
  public userId?: number;
  public processedBy?: number;
  public processedAt?: Date;
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LPRRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    plateNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vehicleColor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    detectedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    imagePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('pending', 'matched', 'no_match', 'processed', 'vehicle_created'),
      allowNull: false,
      defaultValue: 'pending',
    },
    type: {
      type: DataTypes.ENUM('entry', 'exit'),
      allowNull: true,
      defaultValue: 'entry',
    },
    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'reservations',
        key: 'id',
      },
    },
    vehicleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'vehicles',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    processedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    modelName: 'LPRRecord',
    tableName: 'lpr_records',
    timestamps: true,
  }
);
