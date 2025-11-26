import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

// File-based user store
const LIBRARY_PATH = process.env.LIBRARY_PATH || './library';
const USERS_FILE = path.join(LIBRARY_PATH, 'users.json');

export interface User {
  id: string;
  email: string;
  password: string;
}

interface UsersData {
  users: User[];
}

function loadUsers(): UsersData {
  try {
    if (existsSync(USERS_FILE)) {
      const data = readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return { users: [] };
}

function saveUsers(data: UsersData): void {
  try {
    // Ensure directory exists
    const dir = path.dirname(USERS_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
    throw error;
  }
}

export function findUserByEmail(email: string): User | undefined {
  const data = loadUsers();
  return data.users.find(u => u.email === email);
}

export function registerUser(email: string, password: string): Omit<User, 'password'> {
  const data = loadUsers();

  if (data.users.some(u => u.email === email)) {
    throw new Error('User already exists');
  }

  const newUser: User = {
    id: String(data.users.length + 1),
    email,
    password,
  };

  data.users.push(newUser);
  saveUsers(data);

  return {
    id: newUser.id,
    email: newUser.email,
  };
}

export function userExists(email: string): boolean {
  return !!findUserByEmail(email);
}
