// src/components/admin/UsersTable.js
import React from 'react';

const UsersTable = ({ 
  users, 
  currentUser, 
  onEditUser, 
  onDeleteUser, 
  loading 
}) => {
  return (
    <div className="users-table-container">
      <table className="users-table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Nom complet</th>
            <th>Téléphone</th>
            <th>Rôle</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>{user.username}</td>
              <td>{user.fullName}</td>
              <td>{user.phone}</td>
              <td>
                <span className={`role-badge ${
                  user.role === 'admin' ? 'admin-role' : 
                  user.role === 'driver' ? 'driver-role' : 
                  user.role === 'preparator' ? 'preparator-role' : 
                  user.role === 'team-leader' ? 'team-leader-role' : 
                  'direction-role'
                }`}>
                  {user.role === 'admin' ? 'Admin' : 
                  user.role === 'driver' ? 'Chauffeur' : 
                  user.role === 'preparator' ? 'Préparateur' : 
                  user.role === 'team-leader' ? 'Chef d\'équipe' : 
                  'Direction'}
                </span>
              </td>
              <td>
                <div className="table-actions">
                  <button 
                    onClick={() => onEditUser(user)}
                    className="action-button edit-button"
                    title="Modifier"
                    disabled={loading}
                  >
                    ✏️
                  </button>
                  {user._id !== currentUser._id && (
                    <button 
                      onClick={() => onDeleteUser(user._id)}
                      className="action-button delete-button"
                      title="Supprimer"
                      disabled={loading}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTable;