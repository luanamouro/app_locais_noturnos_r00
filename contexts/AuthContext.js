/** Context para gerenciar autenticação global com AsyncStorage e JWT */
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userAPI } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = '@locaisNoturnos:token';
const USER_KEY = '@locaisNoturnos:user';

/** Provider de autenticação com persistência e validação de token */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    loadStoredData();
  }, []);

  /** Carrega e valida token/usuário do AsyncStorage ao iniciar app */
  async function loadStoredData() {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {

        const isValid = await userAPI.validateToken(storedToken);
        
        if (isValid) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else {
          await clearStorage();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  /** Persiste token e usuário no AsyncStorage */
  async function saveToStorage(token, user) {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    }
  }

  /** Remove token e usuário do AsyncStorage */
  async function clearStorage() {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
    }
  }

  /** Autentica usuário e salva token/dados - preserva error.code para tratamento na UI */
  async function signIn(email, password) {
    try {
      const { user: userData, token: userToken } = await userAPI.login({ 
        email, 
        password 
      });
      
      setUser(userData);
      setToken(userToken);
      await saveToStorage(userToken, userData);
      
      return userData;
    } catch (error) {
      const e = new Error(error.message || 'Erro ao fazer login');
      if (error.code) e.code = error.code;
      throw e;
    }
  }

  /** Cria nova conta e autentica automaticamente - preserva error.code */
  async function signUp(email, password, name) {
    try {
      const { user: userData, token: userToken } = await userAPI.register({ 
        email, 
        password, 
        name 
      });
      
      setUser(userData);
      setToken(userToken);
      await saveToStorage(userToken, userData);
      
      return userData;
    } catch (error) {
      const e = new Error(error.message || 'Erro ao registrar usuário');
      if (error.code) e.code = error.code;
      throw e;
    }
  }

  /** Remove autenticação e limpa dados persistidos */
  async function signOut() {
    setUser(null);
    setToken(null);
    await clearStorage();
  }

  /** Atualiza dados do perfil (name, avatar_url) e persiste localmente */
  async function updateProfile(updates) {
    try {
      if (!token) {
        throw new Error('Usuário não autenticado');
      }
      
      const updatedUser = await userAPI.updateProfile(token, updates);
      
      setUser(updatedUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      throw new Error(error.message || 'Erro ao atualizar perfil');
    }
  }

  /** Sincroniza dados do perfil com backend */
  async function refreshProfile() {
    try {
      if (!token) {
        throw new Error('Usuário não autenticado');
      }
      
      const userData = await userAPI.getProfile(token);
      
      setUser(userData);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      
      return userData;
    } catch (error) {
      throw new Error(error.message || 'Erro ao recarregar perfil');
    }
  }

  const value = {
    user,
    token,
    loading,
    signed: !!user,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook para acessar estado e funções de autenticação */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  
  return context;
}

export default AuthContext;
