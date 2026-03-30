import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState('QT'); // 'QT' or 'Meeting'
    const [initialData, setInitialData] = useState(null);

    const openForm = (mode, data = null) => {
        setFormMode(mode);
        setInitialData(data);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setInitialData(null);
    };

    return (
        <UIContext.Provider value={{ isFormOpen, formMode, openForm, closeForm, initialData }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
