import { LoginPageContent } from "@/components/login-page-content";

type LoginPageProps = {
  searchParams: Promise<{
    reason?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;

  return <LoginPageContent hasExpiredSession={reason === "session-expired"} />;
}
