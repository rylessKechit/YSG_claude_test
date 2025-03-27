export const API_URL = process.env.REACT_APP_API_URL;
export const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Configuration des endpoints de l'API
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me'
  },
  USERS: {
    BASE: '/users',
    DETAIL: (id) => `/users/${id}`
  },
  TIMELOGS: {
    BASE: '/timelogs',
    DETAIL: (id) => `/timelogs/${id}`,
    ACTIVE: '/timelogs/active'
  },
  MOVEMENTS: {
    BASE: '/movements',
    DETAIL: (id) => `/movements/${id}`,
    PHOTOS: (id) => `/movements/${id}/photos`,
    BATCH_PHOTOS: (id) => `/movements/${id}/photos/batch`,
    BATCH_S3_PHOTOS: (id) => `/movements/${id}/photos/batch-s3` // Endpoint pour S3 direct
  },
  PREPARATIONS: {
    BASE: '/preparations',
    DETAIL: (id) => `/preparations/${id}`,
    PHOTOS: (id) => `/preparations/${id}/photos`,
    PHOTOS_S3: (id) => `/preparations/${id}/photos-with-s3`, // Nouvel endpoint S3
    BATCH_PHOTOS: (id) => `/preparations/${id}/photos/batch`,
    BATCH_PHOTOS_S3: (id) => `/preparations/${id}/photos/batch-s3`, // Nouvel endpoint batch S3
    TASKS: (id) => `/preparations/${id}/tasks`,
    TASK_S3: (id, taskType, action) => `/preparations/${id}/tasks/${taskType}/${action}-with-s3` // Endpoint task avec S3
  },
  REPORTS: {
    MOVEMENTS: '/reports/movements',
    PREPARATIONS: '/reports/preparations'
  },
  SCHEDULES: {
    BASE: '/schedules',
    USER: (userId) => `/schedules/user/${userId}`,
    ALL: '/schedules/all',
    PREPARATORS: '/schedules/preparators'
  },
  ANALYTICS_ENDPOINTS: {
    PREPARATOR_PERFORMANCE: '/analytics/preparator-performance',
    TASK_METRICS: '/analytics/task-metrics',
    DAILY_METRICS: '/analytics/daily-metrics',
    COMPARATIVE_METRICS: '/analytics/comparative-metrics',
    GLOBAL_METRICS: '/analytics/global-metrics',
    VEHICLE_MODEL_STATS: '/analytics/vehicle-model-stats',
    PEAK_HOURS: '/analytics/peak-hours',
    DRIVER_PERFORMANCE: '/analytics/drivers/:userId/performance',
    DRIVERS_COMPARE: '/analytics/drivers/compare',
    DRIVER_DAILY_METRICS: '/analytics/drivers/daily-metrics',
    DRIVER_GLOBAL_METRICS: '/analytics/drivers/global-metrics',
    DESTINATION_STATS: '/analytics/drivers/destination-stats',
    DRIVER_PEAK_HOURS: '/analytics/drivers/peak-hours'
  },
  ADMIN: {
    BASE: '/admin',
    USERS: '/admin/users',
    WHATSAPP: '/admin/whatsapp-status',
    LOCATIONS: '/admin/locations',
    NETWORKS: '/admin/networks'
  },
  TRACKING: {
    LOCATION: (id) => `/tracking/${id}/location`,
    LOCATIONS: (id) => `/tracking/${id}/locations`,
    LATEST_LOCATION: (id) => `/tracking/${id}/location/latest`,
    ACTIVE_MOVEMENTS: '/tracking/active-movements'
  },
  UPLOAD: {
    BASE: '/upload',
    SINGLE: '/upload/single',
    MULTIPLE: '/upload/multiple',
    PRESIGNED_URL: '/upload/presigned-url'
  },
};