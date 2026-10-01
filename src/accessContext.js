import { createContext, useContext } from 'react';
export const AccessContext = createContext({ caps: {}, allowed: () => false, revoke: () => {}, persona: null, notice: '' });
export const useAccess = () => useContext(AccessContext);
