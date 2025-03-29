// src/components/schedule/ScheduleTable.js
import React from 'react';

const ScheduleTable = ({
  scheduleData,
  days,
  onEdit,
  onDelete,
  onAddEntry
}) => {
  // Formater l'heure
  const formatTime = (timeString) => {
    return timeString || 'N/A';
  };

  return (
    <div className="schedule-table-card">
      <h2 className="table-title">Planning hebdomadaire</h2>
      
      <div className="schedule-table-responsive">
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Préparateur</th>
              {days.map(day => (
                <th key={day.value}>{day.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scheduleData.map(preparator => (
              <tr key={preparator.info._id}>
                <td className="preparator-name">{preparator.info.fullName}</td>
                {days.map(day => {
                  const entry = preparator.schedule[day.value];
                  return (
                    <td key={day.value} className="schedule-cell">
                      {entry ? (
                        <div className={`schedule-entry ${entry.entryType === 'rest' ? 'rest-day' : ''}`}>
                          {entry.entryType === 'work' ? (
                            <>
                              <div className="entry-time">
                                {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                              </div>
                              {entry.location && (
                                <div className="entry-location">{entry.location}</div>
                              )}
                            </>
                          ) : (
                            <div className="rest-day-label">
                              <i className="fas fa-bed"></i> Jour de repos
                            </div>
                          )}
                          <div className="entry-actions">
                            <button 
                              onClick={() => onEdit(entry)}
                              className="action-btn edit-btn"
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => onDelete(entry._id)}
                              className="action-btn delete-btn"
                              title="Supprimer"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="empty-cell">
                          <button 
                            onClick={() => onAddEntry(preparator.info._id, day.value)}
                            className="add-btn"
                            title="Ajouter"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleTable;