// ysg_driver/src/pages/SystemMonitoring.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Navigation from '../components/Navigation';
import AlertMessage from '../components/ui/AlertMessage';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import '../styles/AdminPanel.css';

const SystemMonitoring = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [testResults, setTestResults] = useState(null);
  
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirection si pas admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (currentUser && currentUser.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentUser, isAuthenticated, navigate]);

  // Charger le statut du système
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const statusResponse = await axios.get('/api/admin/system-status');
        setSystemStatus(statusResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur lors de la récupération du statut système');
        setLoading(false);
      }
    };
    
    if (currentUser?.role === 'admin') {
      fetchSystemStatus();
      // Actualiser toutes les 30 secondes
      const interval = setInterval(fetchSystemStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Tester l'auto-déconnexion
  const testAutoDisconnect = async () => {
    try {
      setActionLoading('disconnect');
      setError(null);
      setSuccess(null);
      
      const response = await axios.post('/api/admin/test-auto-disconnect');
      
      if (response.data.success) {
        const result = response.data.result;
        setTestResults(result);
        setSuccess(
          `Test terminé: ${result.disconnected}/${result.processed} utilisateur(s) déconnecté(s)`