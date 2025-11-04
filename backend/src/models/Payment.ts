import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface PaymentAttributes {
  id: number;
  userId: number | null;
  reservationId: number | null;
  amount: number;
  method: 'cash' | 'qr' | 'card';
  reference: string | null;
  notes: string | null;
  recordedBy: number;
  closeoutId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentCreationAttributes
  extends Optional<PaymentAttributes, 'id' | 'userId' | 'reservationId' | 'reference' | 'notes' | 'closeoutId' | 'createdAt' | 'updatedAt'> {}

export class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
  public id!: number;
  public userId!: number | null;
  public reservationId!: number | null;
  public amount!: number;
  public method!: 'cash' | 'qr' | 'card';
  public reference!: string | null;
  public notes!: string | null;
  public recordedBy!: number;
  public closeoutId!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Payment.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    reservationId: { type: DataTypes.INTEGER, allowNull: true },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    method: { type: DataTypes.ENUM('cash', 'qr', 'card'), allowNull: false },
    reference: { type: DataTypes.STRING(100), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    recordedBy: { type: DataTypes.INTEGER, allowNull: false },
    closeoutId: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    timestamps: true,
  }
);
