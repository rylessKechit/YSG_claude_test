// src/components/schedule/ScheduleForm.js
import React from 'react';

const ScheduleForm = ({
  formData,
  editMode,
  preparators,
  agencies, // Nouvelle prop pour les agences
  days,
  onChange,
  onSubmit,
  onCancel,
  loading
}) => {
  return (
    <div className="schedule-form-card">
      <h2 className="form-title">
        {editMode ? 'Modifier une entrée' : 'Ajouter une nouvelle entrée'}
      </h2>
      
      <form onSubmit={onSubmit} className="schedule-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="userId" className="form-label">Préparateur *</label>
            <select
              id="userId"
              name="userId"
              value={formData.userId}
              onChange={onChange}
              className="form-select"
              required
            >
              <option value="">Sélectionner un préparateur</option>
              {preparators.map(preparator => (
                <option key={preparator._id} value={preparator._id}>
                  {preparator.fullName}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="day" className="form-label">Jour *</label>
            <select
              id="day"
              name="day"
              value={formData.day}
              onChange={onChange}
              className="form-select"
              required
            >
              {days.map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="entryType" className="form-label">Type de journée *</label>
            <select
              id="entryType"
              name="entryType"
              value={formData.entryType}
              onChange={onChange}
              className="form-select"
              required
            >
              <option value="work">Jour de travail</option>
              <option value="rest">Jour de repos</option>
            </select>
          </div>
        </div>
        
        {/* Afficher les champs d'horaires uniquement si c'est un jour de travail */}
        {formData.entryType === 'work' && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startTime" className="form-label">Heure de début *</label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={onChange}
                  className="form-input"
                  required={formData.entryType === 'work'}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="endTime" className="form-label">Heure de fin *</label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={onChange}
                  className="form-input"
                  required={formData.entryType === 'work'}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="location" className="form-label">Agence / Lieu de travail</label>
                {/* Remplacer l'input texte par un select d'agences */}
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={onChange}
                  className="form-select"
                >
                  <option value="">Sélectionner une agence</option>
                  {agencies && agencies.map(agency => (
                    <option key={agency._id} value={agency.name}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="tasks" className="form-label">Tâches</label>
              <textarea
                id="tasks"
                name="tasks"
                value={formData.tasks}
                onChange={onChange}
                className="form-textarea"
                placeholder="Description des tâches à effectuer..."
                rows="3"
              ></textarea>
            </div>
          </>
        )}
        
        <div className="form-actions">
          {editMode && (
            <button 
              type="button" 
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Annuler
            </button>
          )}
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : (editMode ? 'Mettre à jour' : 'Ajouter')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleForm;