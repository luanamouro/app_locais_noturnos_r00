import { Redirect } from 'expo-router';
import React from 'react';

/** Rota raiz - redireciona para login */
export default function HomeScreen() {
  return <Redirect href="/login" />;
}
