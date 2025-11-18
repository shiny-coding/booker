import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// Simple in-memory user store for demo purposes
// In production, this could be replaced with a database or file-based storage
const users = new Map<string, { id: string; email: string; password: string; name: string }>();

// Add a default admin user
users.set('admin@bookstore.local', {
  id: '1',
  email: 'admin@bookstore.local',
  password: 'admin123', // In production, this should be hashed!
  name: 'Admin User',
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = users.get(credentials.email as string);

        if (!user) {
          return null;
        }

        // In production, use proper password hashing (bcrypt, argon2, etc.)
        if (user.password !== credentials.password) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});

// Helper function to register a new user
export async function registerUser(email: string, password: string, name: string) {
  if (users.has(email)) {
    throw new Error('User already exists');
  }

  const newUser = {
    id: String(users.size + 1),
    email,
    password, // In production, hash this!
    name,
  };

  users.set(email, newUser);

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
  };
}

// Helper function to check if user exists
export function userExists(email: string): boolean {
  return users.has(email);
}
