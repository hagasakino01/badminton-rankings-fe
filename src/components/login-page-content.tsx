"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { persistSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { User } from "@/types/api";

type LoginPageContentProps = {
  hasExpiredSession: boolean;
};

export function LoginPageContent({ hasExpiredSession }: LoginPageContentProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await apiFetch<{ token: string; user: User }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );

      persistSession(response);
      router.push("/dashboard");
    } catch {
      return;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Card className="order-2 border-0 bg-[linear-gradient(135deg,rgba(15,118,110,0.95),rgba(26,53,88,0.92))] text-primary-foreground shadow-2xl shadow-primary/15 ring-1 ring-white/10 lg:order-1">
          <CardContent className="flex h-full flex-col justify-between gap-8 px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/75">
                <ShieldCheck className="size-3.5" />
                Manager access
              </div>
              <div className="space-y-4">
                <h1 className="max-w-2xl font-heading text-3xl leading-none font-semibold tracking-tight text-balance sm:text-5xl">
                  Quay lại bàn điều phối của giải đấu.
                </h1>
                <p className="max-w-xl text-base leading-7 text-white/78">
                  Mọi session, mùa giải và bảng xếp hạng đang chờ bạn tiếp tục
                  điều phối trong một giao diện mới rõ ràng hơn.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-black/12 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                  Kiểm soát
                </p>
                <p className="mt-3 text-xl font-semibold">
                  Season, session, ranking
                </p>
              </div>
              <div className="rounded-3xl bg-black/12 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                  An toàn dữ liệu
                </p>
                <p className="mt-3 text-xl font-semibold">
                  Khóa kết quả sau khi xác nhận
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="order-1 border-0 bg-card/90 shadow-xl shadow-black/5 ring-1 ring-black/6 backdrop-blur lg:order-2">
          <CardHeader className="space-y-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-5" />
            </div>
            <div className="space-y-2">
              <CardTitle className="font-heading text-2xl">
                Đăng nhập
              </CardTitle>
              <CardDescription>
                Truy cập dashboard để tạo bảng, mở mùa giải và nhập kết quả thi
                đấu.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {hasExpiredSession && (
              <Alert variant="destructive">
                <AlertTitle>Phiên đăng nhập đã hết hạn</AlertTitle>
                <AlertDescription>
                  Bạn đã được đăng xuất tự động. Vui lòng đăng nhập lại để tiếp tục.
                </AlertDescription>
              </Alert>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="manager@club.vn"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full justify-center",
                )}
              >
                {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
                {!submitting && <ArrowRight className="size-4" />}
              </button>
            </form>

            <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              Chưa có tài khoản?{" "}
              <Link
                href="/register"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Tạo tài khoản quản trị
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
