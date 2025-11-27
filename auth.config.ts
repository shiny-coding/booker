import type { NextAuthConfig } from 'next-auth';

// Auth config without Node.js dependencies (Edge-compatible)
// This is used by middleware
export const authConfig: NextAuthConfig = {
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith('/login') ||
                         nextUrl.pathname.startsWith('/register');

      // Allow public pages
      if (nextUrl.pathname === '/') {
        return true;
      }

      // Allow share pages (public access)
      if (nextUrl.pathname.startsWith('/share/')) {
        return true;
      }

      // Redirect logged-in users away from auth pages
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL('/library', nextUrl));
      }

      // Redirect non-logged-in users to login
      if (!isLoggedIn && !isAuthPage) {
        return Response.redirect(new URL('/login', nextUrl));
      }

      return true;
    },
  },
  providers: [], // Providers are added in auth.ts
};
