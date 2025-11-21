import { Redirect } from 'expo-router';
import React from 'react';

/**
 * Página inicial redireciona diretamente para a tela de login.
 */
export default function HomeScreen() {
  return <Redirect href="/login" />;
}
