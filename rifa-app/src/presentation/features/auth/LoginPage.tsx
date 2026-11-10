import { ArrowLeft, Lock, Mail } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema, passwordResetSchema } from '../../../application/schemas';
import { useAsyncAction } from '../../shared/hooks/useAsyncAction';
import { useServices } from '../../shared/services';
import { Button } from '../../shared/ui/Button';
import { Field, TextInput } from '../../shared/ui/form';
import { useZodForm } from '../forms/useZodForm';
import { useSession } from './session';

const AuthCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100 space-y-6">
      <header className="text-center space-y-2">
        <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
          <Lock size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 text-sm">{subtitle}</p>
      </header>
      {children}
    </div>
  </div>
);

const SignInForm = ({ onForgot }: { onForgot: (email: string) => void }) => {
  const { auth } = useServices();
  const navigate = useNavigate();
  const location = useLocation();
  const { pending, run } = useAsyncAction();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useZodForm(loginSchema, { email: '', password: '' });

  const from = (location.state as { from?: string } | null)?.from ?? '/admin';
  const submit = handleSubmit(async ({ email, password }) => {
    const ok = await run(() => auth.signIn(email, password).then(() => true));
    if (ok) navigate(from, { replace: true });
  });

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Correo electrónico" htmlFor="login-email" error={errors.email?.message}>
        <TextInput id="login-email" type="email" autoComplete="username" invalid={!!errors.email} {...register('email')} />
      </Field>
      <Field label="Contraseña" htmlFor="login-password" error={errors.password?.message}>
        <TextInput id="login-password" type="password" autoComplete="current-password" invalid={!!errors.password} {...register('password')} />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pending}>
        Entrar al panel
      </Button>
      <button
        type="button"
        onClick={() => onForgot(getValues('email'))}
        className="w-full text-sm font-bold text-indigo-600 hover:text-indigo-800"
      >
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  );
};

const ResetForm = ({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) => {
  const { auth } = useServices();
  const { pending, run } = useAsyncAction();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(passwordResetSchema, { email: initialEmail });

  const submit = handleSubmit(async ({ email }) => {
    // Firebase no revela si el correo existe; el mensaje es el mismo en ambos casos.
    const ok = await run(() => auth.sendPasswordReset(email).then(() => true));
    if (ok) setSent(true);
  });

  return sent ? (
    <div className="space-y-5 text-center">
      <p className="text-sm text-slate-600">
        Si el correo está registrado, te llegará un enlace para crear una nueva contraseña. Revisa también la carpeta de
        spam.
      </p>
      <Button variant="secondary" fullWidth onClick={onBack} icon={<ArrowLeft size={16} />}>
        Volver a iniciar sesión
      </Button>
    </div>
  ) : (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Correo electrónico" htmlFor="reset-email" error={errors.email?.message}>
        <TextInput id="reset-email" type="email" autoComplete="username" invalid={!!errors.email} {...register('email')} />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pending} icon={<Mail size={18} />}>
        Enviar enlace
      </Button>
      <Button variant="ghost" fullWidth onClick={onBack} icon={<ArrowLeft size={16} />}>
        Volver
      </Button>
    </form>
  );
};

export const LoginPage = () => {
  const session = useSession();
  const [resetEmail, setResetEmail] = useState<string | null>(null);

  if (session?.isAdmin) return <Navigate to="/admin" replace />;

  return resetEmail === null ? (
    <AuthCard title="Acceso admin" subtitle="Ingresa tus credenciales para gestionar las rifas">
      <SignInForm onForgot={setResetEmail} />
    </AuthCard>
  ) : (
    <AuthCard title="Restablecer contraseña" subtitle="Te enviaremos un enlace a tu correo">
      <ResetForm initialEmail={resetEmail} onBack={() => setResetEmail(null)} />
    </AuthCard>
  );
};
