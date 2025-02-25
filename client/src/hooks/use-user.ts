/**
 * User Authentication Hook
 * 
 * Provides user authentication state management and operations using React Query.
 * Handles login, logout, registration, and user data updates.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@db/schema";

// Type definitions for authentication operations
type RequestResult = {
  ok: true;
} | {
  ok: false;
  message: string;
};

type AuthData = {
  username: string;
  password: string;
};

type UpdateUserData = Partial<Omit<User, 'id' | 'password'>>;

/**
 * Generic request handler for authentication operations
 */
async function handleRequest(
  url: string,
  method: string,
  body?: AuthData | UpdateUserData
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include", // Important for session management
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }
      const message = await response.text();
      return { ok: false, message };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

/**
 * Fetches the current user's data
 */
async function fetchUser(): Promise<User | null> {
  const response = await fetch('/api/user', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

/**
 * Custom hook for user authentication and management
 */
export function useUser() {
  const queryClient = useQueryClient();

  // User data query
  const { data: user, error, isLoading } = useQuery<User | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: Infinity,
    retry: false
  });

  // Login mutation
  const loginMutation = useMutation<RequestResult, Error, AuthData>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // Registration mutation
  const registerMutation = useMutation<RequestResult, Error, AuthData>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // Update user mutation
  const updateMutation = useMutation<RequestResult, Error, UpdateUserData>({
    mutationFn: (data) => handleRequest('/api/user', 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    updateUser: updateMutation.mutateAsync,
  };
}