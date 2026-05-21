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
        <div className="filters-bar">
            <div className="filters-row">
                <div className="filter-group">
                    <label>Statut</label>
                    <select 
                        className="form-input" 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="pending_manager">En attente manager</option>
                        <option value="pending_admin">En attente admin</option>
                        <option value="approved">Approuvé</option>
                        <option value="rejected">Refusé</option>
                    </select>
                </div>
                
                <div className="filter-group">
                    <label>Type de congé</label>
                    <select 
                        className="form-input" 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">Tous les types</option>
                        <option value="1">Congés Payés</option>
                        <option value="2">Congé sans solde</option>
                    </select>
                </div>
                
                <div className="filter-group search-group">
                    <label>Rechercher</label>
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
                        className="btn btn-sm btn-secondary reset-btn" 
                        onClick={onReset}
                    >
                        Réinitialiser
                    </button>
                )}
            </div>
            
            <div className="filters-info">
                {filteredCount} demande(s) trouvée(s) sur {totalCount}
            </div>
        </div>
    );
}

export default LeaveFilters;