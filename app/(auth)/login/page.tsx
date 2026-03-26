import LoginForm from "@/app/components/auth/LoginForm";

export const metadata = { title: "Sign in · X" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ unauthorized?: string }>;
}) {
  const { unauthorized } = await searchParams;
  return <LoginForm unauthorized={!!unauthorized} />;
}
