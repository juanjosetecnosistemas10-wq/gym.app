import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createServerClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) =>
            event.cookies.set(name, value, { ...options, path: '/' })
          );
        },
      },
    }
  );

  // Obtener sesión actual
  const { data: { session } } = await supabase.auth.getSession();

  // Rutas protegidas — si no hay sesión, redirige al login
  const protectedRoutes = ['/dashboard'];
  const isProtected = protectedRoutes.some(r => event.url.pathname.startsWith(r));

  if (isProtected && !session) {
    throw redirect(303, '/login');
  }

  // Si ya está logueado y va al login, redirige al dashboard
  if (event.url.pathname === '/login' && session) {
    throw redirect(303, '/dashboard');
  }

  // Pasar supabase y session al layout
  event.locals.supabase = supabase;
  event.locals.session = session;

  return resolve(event);
};