// frontend/src/components/employee/LeaveFilters.jsx
import React from 'react';

function LeaveFilters({
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    searchTerm,
    setSearchTerm,
    totalCount,
    filteredCount,
    onReset
}) {
    return (
        <div className="filters-bar" style={{
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap',
            marginBottom: '20px',
            alignItems: 'flex-end',
            background: 'white',
            padding: '15px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px' }}>Statut</label>
                <select 
                    className="form-input" 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ width: '150px' }}
                >
                    <option value="all">Tous les statuts</option>
                    <option value="pending_manager">En attente manager</option>
                    <option value="pending_admin">En attente admin</option>
                    <option value="approved">Approuvé</option>
                    <option value="rejected">Refusé</option>
                </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px' }}>Type</label>
                <select 
                    className="form-input" 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ width: '200px' }}
                >
                    <option value="all">Tous les types</option>
                    <option value="1">🏖️ Congés Payés</option>
                    <option value="2">📅 Réduction du Temps de Travail (RTT)</option>
                    <option value="3">📝 Congé sans solde</option>
                    <option value="permission">⏰ Permission</option>
                </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label style={{ fontSize: '12px' }}>Rechercher</label>
                <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Date (YYYY-MM-DD) ou motif..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {(filterStatus !== 'all' || filterType !== 'all' || searchTerm) && (
                <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={onReset}
                >
                    🗑️ Réinitialiser
                </button>
            )}
            
            <div className="info-text" style={{ marginBottom: 0, fontSize: '12px', color: '#666' }}>
                📊 {filteredCount} demande(s) trouvée(s) sur {totalCount}
            </div>
        </div>
    );
}

export default LeaveFilters;