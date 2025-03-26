// src/services/timelogService.js
import { api } from './authService';
import { ENDPOINTS } from '../config';

const timelogService = {
  getActiveTimeLog: async () => {
    const response = await api.get(ENDPOINTS.TIMELOGS.ACTIVE);
    return response.data;
  },
  
  startTimeLog: async (data) => {
    const response = await api.post(ENDPOINTS.TIMELOGS.BASE, data);
    return response.data;
  },
  
  endTimeLog: async (data) => {
    const response = await api.post(`${ENDPOINTS.TIMELOGS.BASE}/end`, data);
    return response.data;
  },
  
  getTimeLogs: async (page = 1, limit = 10) => {
    const response = await api.get(`${ENDPOINTS.TIMELOGS.BASE}?page=${page}&limit=${limit}`);
    return response.data;
  }
};

export default timelogService;