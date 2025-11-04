import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface CashCloseoutAttributes {
  id: number;
  fromAt: Date;
  toAt: Date;
  totalCash: number;
  totalQR: number;
  totalCard: number;
  totalOverall: number;
  closedBy: number; // users.id
  closedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashCloseoutCreationAttributes
  extends Optional<CashCloseoutAttributes, 'id' | 'closedAt' | 'notes' | 'createdAt' | 'updatedAt'> {}

export class CashCloseout extends Model<CashCloseoutAttributes, CashCloseoutCreationAttributes> implements CashCloseoutAttributes {
  public id!: number;
  public fromAt!: Date;
  public toAt!: Date;
  public totalCash!: number;
  public totalQR!: number;
  public totalCard!: number;
  public totalOverall!: number;
  public closedBy!: number;
  public closedAt!: Date | null;
  public notes!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CashCloseout.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fromAt: { type: DataTypes.DATE, allowNull: false },
    toAt: { type: DataTypes.DATE, allowNull: false },
    totalCash: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    totalQR: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    totalCard: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    totalOverall: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    closedBy: { type: DataTypes.INTEGER, allowNull: false },
    closedAt: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'CashCloseout',
    tableName: 'cash_closeouts',
    timestamps: true,
  }
);
