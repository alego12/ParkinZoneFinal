import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface VehicleAttributes {
  id: number;
  userId: number | null;
  model: string;
  plate: string;
  color: string;
  type: 'car' | 'motorcycle';
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleCreationAttributes extends Optional<VehicleAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Vehicle extends Model<VehicleAttributes, VehicleCreationAttributes> implements VehicleAttributes {
  public id!: number;
  public userId!: number | null;
  public model!: string;
  public plate!: string;
  public color!: string;
  public type!: 'car' | 'motorcycle';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Vehicle.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    plate: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('car', 'motorcycle'),
      allowNull: false,
      defaultValue: 'car',
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
    modelName: 'Vehicle',
    tableName: 'vehicles',
    timestamps: true,
  }
);
