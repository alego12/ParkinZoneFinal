import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ScheduleAttributes {
  id: number;
  name: string;
  description: string;
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isActive: boolean;
  overtimeRate: number; // Tarifa adicional por hora excedente
  indefiniteRate: number; // Tarifa adicional por reserva indefinida
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleCreationAttributes extends Optional<ScheduleAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Schedule extends Model<ScheduleAttributes, ScheduleCreationAttributes> implements ScheduleAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public dayOfWeek!: number;
  public startTime!: string;
  public endTime!: string;
  public isActive!: boolean;
  public overtimeRate!: number;
  public indefiniteRate!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Schedule.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 6,
      },
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    overtimeRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.50, // $0.50 adicional por hora excedente
    },
    indefiniteRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 2.00, // $2.00 adicional por reserva indefinida
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
    modelName: 'Schedule',
    tableName: 'schedules',
    timestamps: true,
  }
);

export default Schedule;
