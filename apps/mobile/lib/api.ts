/**
 * YULA Mobile - API Client
 *
 * Handles all API communication with the backend.
 */

import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'yula_access_token';
const REFRESH_TOKEN_KEY = 'yula_refresh_token';

// Get stored token
async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

// Store token
export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

// Clear tokens
export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// API request wrapper
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==================== Auth ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

export const auth = {
  login: (data: LoginRequest) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  signUp: (data: SignUpRequest) =>
    request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),

  me: () =>
    request<AuthResponse['user']>('/auth/me'),
};

// ==================== Chats ====================

export interface Chat {
  id: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  createdAt: string;
}

export interface CreateChatRequest {
  title?: string;
  message?: string;
}

export interface SendMessageRequest {
  content: string;
  model?: string;
}

export const chats = {
  list: (archived = false) =>
    request<Chat[]>(`/chats?archived=${archived}`),

  get: (id: string) =>
    request<{ chat: Chat; messages: Message[] }>(`/chats/${id}`),

  create: (data: CreateChatRequest) =>
    request<Chat>('/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Chat>) =>
    request<Chat>(`/chats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/chats/${id}`, { method: 'DELETE' }),

  sendMessage: (chatId: string, data: SendMessageRequest) =>
    request<Message>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ==================== PAC ====================

export interface Reminder {
  id: string;
  type: 'explicit' | 'implicit';
  content: string;
  context?: string;
  triggerAt: string;
  status: 'pending' | 'sent' | 'dismissed' | 'snoozed';
  conversationId?: string;
}

export const pac = {
  list: (filter?: 'pending' | 'completed' | 'all') =>
    request<Reminder[]>(`/pac/reminders${filter ? `?filter=${filter}` : ''}`),

  get: (id: string) =>
    request<Reminder>(`/pac/reminders/${id}`),

  dismiss: (id: string) =>
    request<void>(`/pac/reminders/${id}/dismiss`, { method: 'POST' }),

  snooze: (id: string, duration: string) =>
    request<Reminder>(`/pac/reminders/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
    }),

  getSettings: () =>
    request<any>('/pac/settings'),

  updateSettings: (settings: any) =>
    request<any>('/pac/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),
};

// ==================== Council ====================

export interface CouncilQuery {
  query: string;
  personas?: string[];
}

export interface CouncilResponse {
  personaId: string;
  content: string;
  latencyMs: number;
}

export interface CouncilSession {
  id: string;
  query: string;
  responses: CouncilResponse[];
  synthesis?: string;
  createdAt: string;
}

export const council = {
  query: (data: CouncilQuery) =>
    request<CouncilSession>('/council/query', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  history: () =>
    request<CouncilSession[]>('/council/history'),
};

// ==================== User ====================

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  tier: 'free' | 'pro' | 'team';
  xp: number;
  level: number;
  streak: number;
  achievements: number;
}

export const user = {
  profile: () =>
    request<UserProfile>('/user/profile'),

  update: (data: Partial<UserProfile>) =>
    request<UserProfile>('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  stats: () =>
    request<{ xp: number; level: number; streak: number; achievements: any[] }>('/user/stats'),
};

// ==================== Memory ====================

export interface Memory {
  id: string;
  type: 'explicit' | 'implicit' | 'preference';
  content: string;
  source?: string;
  createdAt: string;
}

export const memory = {
  list: () =>
    request<Memory[]>('/memory'),

  create: (content: string, type: Memory['type']) =>
    request<Memory>('/memory', {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    }),

  delete: (id: string) =>
    request<void>(`/memory/${id}`, { method: 'DELETE' }),

  search: (query: string) =>
    request<Memory[]>(`/memory/search?q=${encodeURIComponent(query)}`),
};

// Export default API object
export const api = {
  auth,
  chats,
  pac,
  council,
  user,
  memory,
};

export default api;
