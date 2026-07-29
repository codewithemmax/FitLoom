import { AuthForm } from '../components/auth-form';

const AuthPage = (): React.ReactElement => (
  <section className="panel narrow auth-panel" aria-labelledby="auth-title">
    <p className="eyebrow">Secure access</p>
    <h1 id="auth-title">Sign in to your TrueFit wardrobe</h1>
    <p className="lede">Your saved results and fit profile stay scoped to your account.</p>
    <AuthForm />
  </section>
);

export default AuthPage;
