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
    PHOTOS: (id) => `/movements/${id}/photos`
  },
  PREPARATIONS: {
    BASE: '/preparations',
    DETAIL: (id) => `/preparations/${id}`,
    PHOTOS: (id) => `/preparations/${id}/photos`,
    TASKS: (id) => `/preparations/${id}/tasks`
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
};