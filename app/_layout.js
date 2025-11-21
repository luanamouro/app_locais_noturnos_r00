import { Stack } from "expo-router";
import React from "react";
import { AuthProvider } from "../contexts/AuthContext";

/**
 * Define a pilha raiz do Expo Router para todas as rotas da aplicação.
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack />
    </AuthProvider>
  );
}
