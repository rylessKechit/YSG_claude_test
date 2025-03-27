// src/components/movement/RouteInfoSection.js
import React from 'react';
import DateDisplay from '../ui/DateDisplay';

const RouteInfoSection = ({ movement }) => {
  // Composant pour afficher un point de l'itinéraire (départ ou arrivée)
  const RoutePoint = ({ type, location, time }) => {
    const isArrival = type === 'arrival';
    
    return (
      <div className="route-point">
        <div className={`point-marker ${type}`}></div>
        <div className="point-details">
          <div className="point-type">{isArrival ? 'Arrivée' : 'Départ'}</div>
          <div className="point-name">{location.name}</div>
          <div className="point-time">
            <DateDisplay date={time} />
          </div>
          {location.coordinates?.latitude && (
            <div className="point-coordinates">
              Lat: {location.coordinates.latitude.toFixed(4)}, 
              Lng: {location.coordinates.longitude.toFixed(4)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="detail-section route-info">
      <h2 className="section-title">
        <i className="fas fa-map-marker-alt"></i> Itinéraire
      </h2>
      <div className="route-map">
        <RoutePoint 
          type="departure" 
          location={movement.departureLocation} 
          time={movement.departureTime} 
        />
        
        <RoutePoint 
          type="arrival" 
          location={movement.arrivalLocation} 
          time={movement.arrivalTime} 
        />
      </div>
    </div>
  );
};

export default RouteInfoSection;