import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';
import { User } from '@/types';

const AUTH_STORAGE_KEY = 'fintech_auth';
const USER_STORAGE_KEY = 'fintech_user';
const FIRST_LAUNCH_KEY = 'fintech_first_launch_done';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  passcode: string | null;
  biometricEnabled: boolean;
}

let storedPasscode: string | null = null;

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    passcode: null,
    biometricEnabled: false,
  });

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('Loading stored auth...');
      
      const firstLaunchDone = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
      
      if (!firstLaunchDone) {
        console.log('First launch detected - clearing any existing auth data');
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
        storedPasscode = null;
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          passcode: null,
          biometricEnabled: false,
        });
        return;
      }
      
      const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      
      console.log('Auth data found:', !!authData, 'User data found:', !!userData);
      
      if (authData && userData) {
        const auth = JSON.parse(authData);
        const user = JSON.parse(userData);
        storedPasscode = auth.passcode;
        console.log('Passcode loaded successfully');
        setState({
          user,
          isAuthenticated: false,
          isLoading: false,
          passcode: auth.passcode,
          biometricEnabled: auth.biometricEnabled || false,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.log('Error loading auth:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const register = useCallback(async (
    user: Omit<User, 'id' | 'createdAt'>,
    passcode: string,
    biometricEnabled: boolean
  ): Promise<boolean> => {
    console.log('AuthContext: Starting registration for', user.email);
    
    try {
      if (!user.fullName || !user.email || !user.phone || !user.dateOfBirth) {
        console.error('AuthContext: Missing required user fields');
        return false;
      }
      
      if (!passcode || passcode.length !== 6) {
        console.error('AuthContext: Invalid passcode');
        return false;
      }

      const newUser: User = {
        ...user,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      console.log('AuthContext: Saving user data...');
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      
      console.log('AuthContext: Saving auth data...');
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        passcode,
        biometricEnabled,
      }));
      
      storedPasscode = passcode;
      console.log('AuthContext: Registration complete, updating state');

      setState({
        user: newUser,
        isAuthenticated: true,
        isLoading: false,
        passcode,
        biometricEnabled,
      });

      console.log('AuthContext: State updated, user authenticated');
      return true;
    } catch (error) {
      console.error('AuthContext: Error registering:', error);
      return false;
    }
  }, []);

  const login = useCallback(async (enteredPasscode: string) => {
    const currentPasscode = storedPasscode || state.passcode;
    console.log('Login attempt - entered:', enteredPasscode, 'stored exists:', !!currentPasscode);
    
    if (enteredPasscode === currentPasscode) {
      console.log('Login successful');
      setState(prev => ({ ...prev, isAuthenticated: true }));
      return true;
    }
    console.log('Login failed - passcode mismatch');
    return false;
  }, [state.passcode]);

  const loginWithBiometric = useCallback(async () => {
    if (state.biometricEnabled && state.user) {
      setState(prev => ({ ...prev, isAuthenticated: true }));
      return true;
    }
    return false;
  }, [state.biometricEnabled, state.user]);

  const logout = useCallback(() => {
    setState(prev => ({ ...prev, isAuthenticated: false }));
  }, []);

  const clearAll = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      passcode: null,
      biometricEnabled: false,
    });
  }, []);

  const loginWithPrivy = useCallback(async (provider: string): Promise<boolean> => {
    console.log('AuthContext: Starting Privy login with', provider);
    
    try {
      if (state.user) {
        setState(prev => ({ ...prev, isAuthenticated: true }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('AuthContext: Error logging in with Privy:', error);
      return false;
    }
  }, [state.user]);

  const registerWithPrivy = useCallback(async (
    userData: { fullName: string; email?: string; phone?: string; walletAddress: string; provider: string },
    provider: string
  ): Promise<boolean> => {
    console.log('AuthContext: Starting Privy registration with', provider);
    
    try {
      const newUser: User = {
        id: Date.now().toString(),
        fullName: userData.fullName,
        email: userData.email || '',
        phone: userData.phone,
        walletAddress: userData.walletAddress,
        provider: provider,
        createdAt: new Date().toISOString(),
      };

      console.log('AuthContext: Saving Privy user data...');
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        passcode: null,
        biometricEnabled: false,
        privyProvider: provider,
      }));

      console.log('AuthContext: Privy registration complete');

      setState({
        user: newUser,
        isAuthenticated: true,
        isLoading: false,
        passcode: null,
        biometricEnabled: false,
      });

      return true;
    } catch (error) {
      console.error('AuthContext: Error registering with Privy:', error);
      return false;
    }
  }, []);

  const hasAccount = state.user !== null;

  return {
    ...state,
    hasAccount,
    register,
    registerWithPrivy,
    login,
    loginWithBiometric,
    loginWithPrivy,
    logout,
    clearAll,
  };
});
