import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const ProjectGuide = sequelize.define('ProjectGuide', {
  prompt: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },
  techStack: {
    type: DataTypes.JSON,
    allowNull: false
  },
  features: {
    type: DataTypes.JSON,
    allowNull: false
  },
  guide: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
}, {
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci'
})

export default ProjectGuide 