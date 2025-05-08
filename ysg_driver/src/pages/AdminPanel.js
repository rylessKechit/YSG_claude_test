// src/pages/AdminPanel.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import Navigation from '../components/Navigation';
import AlertMessage from '../components/ui/AlertMessage';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import UserForm from '../components/admin/UserForm';
import UsersTable from '../components/admin/UsersTable';
import AdminTools from '../components/admin/AdminTools';

import '../styles/AdminPanel.css';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' ou 'edit'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    sixtNumber: '',
    role: 'driver'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [allUsers, setAllUsers] = useState([]);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Rediriger si l'utilisateur n'est pas administrateur
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Fonction pour trier les utilisateurs selon l'ordre spécifié des rôles
  const sortUsersByRole = (users) => {
    // Définir l'ordre des rôles (1 = premier, 5 = dernier)
    const roleOrder = {
      'admin': 1,
      'direction': 2,
      'team-leader': 3, // 'chef d'équipe' dans l'interface, 'team-leader' dans la base de données
      'driver': 4,      // 'chauffeur' dans l'interface, 'driver' dans la base de données
      'preparator': 5   // 'préparateur' dans l'interface, 'preparator' dans la base de données
    };

    // Créer une copie de la liste des utilisateurs pour ne pas modifier l'original
    return [...users].sort((a, b) => {
      // Si les rôles sont différents, trier par priorité de rôle
      if (a.role !== b.role) {
        return roleOrder[a.role] - roleOrder[b.role];
      }
      
      // Si les rôles sont identiques, trier par nom complet
      return a.fullName.localeCompare(b.fullName);
    });
  };

  // Charger la liste des utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await userService.getAllUsers();
        
        // Appliquer le tri par rôle
        const sortedData = sortUsersByRole(data);
        
        setUsers(sortedData);
        setAllUsers(data);
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des utilisateurs:', err);
        setError('Erreur lors du chargement des utilisateurs');
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      fullName: '',
      email: '',
      phone: '',
      sixtNumber: '',
      role: 'driver'
    });
    setShowUserForm(false);
    setSelectedUser(null);
    setFormMode('create');
  };

  // Ouvrir le formulaire pour créer un utilisateur
  const handleCreateUser = () => {
    resetForm();
    setShowUserForm(true);
    setFormMode('create');
  };

  // Ouvrir le formulaire pour modifier un utilisateur
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      // Le mot de passe n'est pas inclus pour la modification
      password: '',
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      sixtNumber: user.sixtNumber || '',
      role: user.role
    });
    setShowUserForm(true);
    setFormMode('edit');
  };

  // Gérer les changements dans le formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      if (formMode === 'create') {
        // Créer un nouvel utilisateur
        const response = await userService.createUser(formData);
        // Mettre à jour localement
        const newUsers = [...allUsers, response.user];
        const sortedUsers = sortUsersByRole(newUsers);
        setAllUsers(newUsers);
        setUsers(sortedUsers);
        setSuccess('Utilisateur créé avec succès');
      } else {
        // Modifier un utilisateur existant
        const response = await userService.updateUser(selectedUser._id, formData);
        // Mettre à jour localement
        const updatedUsers = allUsers.map(user => 
          user._id === selectedUser._id ? response.user : user
        );
        const sortedUsers = sortUsersByRole(updatedUsers);
        setAllUsers(updatedUsers);
        setUsers(sortedUsers);
        setSuccess('Utilisateur mis à jour avec succès');
      }
      
      // Réinitialiser le formulaire
      resetForm();
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => setSuccess(null), 3000);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'opération');
      console.error(err);
      setLoading(false);
    }
  };
  
  // Supprimer un utilisateur
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await userService.deleteUser(userId);
      
      // Mettre à jour localement
      const remainingUsers = allUsers.filter(user => user._id !== userId);
      const sortedUsers = sortUsersByRole(remainingUsers);
      setAllUsers(remainingUsers);
      setUsers(sortedUsers);
      
      setSuccess('Utilisateur supprimé avec succès');
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => setSuccess(null), 3000);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div>
      <Navigation />
      
      <div className="admin-container">
        <h1 className="page-title">Panneau d'administration</h1>
        
        {error && <AlertMessage type="error" message={error} />}
        {success && <AlertMessage type="success" message={success} />}
        
        <div className="admin-header">
          <h2 className="section-title">Gestion des utilisateurs</h2>
          <button 
            onClick={handleCreateUser}
            className="btn btn-primary"
          >
            Ajouter un utilisateur
          </button>
        </div>
        
        {showUserForm && (
          <UserForm 
            formData={formData}
            formMode={formMode}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            loading={loading}
          />
        )}
        
        {loading && !showUserForm ? (
          <div className="loading-container">
            <LoadingSpinner />
          </div>
        ) : (
          <UsersTable 
            users={users} // La liste est déjà triée par la fonction sortUsersByRole
            currentUser={currentUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            loading={loading}
          />
        )}
      </div>
      
      <AdminTools />
    </div>
  );
};

export default AdminPanel;