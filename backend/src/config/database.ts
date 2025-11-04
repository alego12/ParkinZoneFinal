import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const useSSL = String(process.env.DB_SSL || '').toLowerCase() === 'true';
const dbUrl = process.env.DB_URL;

// Configuración SSL para certificados autofirmados (hosting económico)
const sslConfig = useSSL
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Acepta certificados autofirmados
      },
    }
  : {};

let sequelize: Sequelize;

if (dbUrl) {
  sequelize = new Sequelize(dbUrl, {
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: sslConfig,
  });
} else {
  sequelize = new Sequelize({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'parking_zone_db',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: sslConfig,
  });
}

export default sequelize;
