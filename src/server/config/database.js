import { Sequelize } from 'sequelize'
import { config } from 'dotenv'

config()

const sequelize = new Sequelize(
  process.env.DB_NAME || 'project_prompt',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'root',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    dialectOptions: {
      charset: 'utf8mb4'
    }
  }
)

export default sequelize 