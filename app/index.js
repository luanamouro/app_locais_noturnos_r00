import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Landing page que apresenta opções rápidas de autenticação e navegação.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bora Sair</Text>

      <TouchableOpacity style={[styles.button, styles.googleButton]}>
        <Text style={styles.buttonText}>Entrar com Google</Text>
      </TouchableOpacity>

      
      <TouchableOpacity
        style={[styles.button, styles.emailButton]}
        onPress={() => router.push('/login')}
      >
        <Text style={styles.buttonText}>Entrar com Email</Text>
      </TouchableOpacity>


      <TouchableOpacity
          style={[styles.button, styles.registerButton]}
          onPress={() => router.push('/register')}
      >
        <Text style={styles.buttonText}>Registrar</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 50,
  },
  button: {
    width: '80%',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginVertical: 10,
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  emailButton: {
    backgroundColor: '#4285F4',
  },
  registerButton: {
    backgroundColor: '#34A853',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  
});
