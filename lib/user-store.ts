import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { getUsersPath } from './paths';

const SALT_ROUNDS = 10;

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
    const usersFile = getUsersPath();
    if (existsSync(usersFile)) {
      const data = readFileSync(usersFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return { users: [] };
}

function saveUsers(data: UsersData): void {
  try {
    const usersFile = getUsersPath();
    // Ensure directory exists
    const dir = path.dirname(usersFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(usersFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
    throw error;
  }
}

export function findUserByEmail(email: string): User | undefined {
  const data = loadUsers();
  return data.users.find(u => u.email === email);
}

export async function registerUser(email: string, password: string): Promise<Omit<User, 'password'>> {
  const data = loadUsers();

  if (data.users.some(u => u.email === email)) {
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser: User = {
    id: String(data.users.length + 1),
    email,
    password: hashedPassword,
  };

  data.users.push(newUser);
  saveUsers(data);

  return {
    id: newUser.id,
    email: newUser.email,
  };
}

export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function userExists(email: string): boolean {
  return !!findUserByEmail(email);
}
