import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';

// Full auth config with Node.js dependencies (for API routes)
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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

        // Dynamic import to avoid Edge Runtime issues
        const { findUserByEmail, verifyPassword } = await import('@/lib/user-store');
        const user = findUserByEmail(credentials.email as string);

        if (!user) {
          return null;
        }

        const isValidPassword = await verifyPassword(credentials.password as string, user.password);
        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
        };
      },
    }),
  ],
});
