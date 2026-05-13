"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, UserPlus } from "lucide-react";

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

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await apiFetch<{ token: string; user: User }>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
        <Card className="border-0 bg-[linear-gradient(145deg,rgba(250,248,241,0.96),rgba(225,238,233,0.92))] shadow-2xl shadow-black/6 ring-1 ring-black/6">
          <CardContent className="flex h-full flex-col justify-between gap-8 px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-primary">
                <Sparkles className="size-3.5" />
                New control room
              </div>
              <div className="space-y-4">
                <h1 className="max-w-2xl font-heading text-4xl leading-none font-semibold tracking-tight text-balance sm:text-5xl">
                  Tạo tài khoản quản trị để khởi động mùa giải đầu tiên.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Sau khi đăng ký, bạn có thể dựng group, nhập roster, mở season,
                  sinh buổi đấu và chốt kết quả trực tiếp trên dashboard mới.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { value: "1", label: "tài khoản quản trị đầu tiên" },
                { value: "∞", label: "buổi đấu có thể theo dõi" },
                { value: "100%", label: "luồng điều phối trong một nơi" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-border/70 bg-background/75 p-5"
                >
                  <p className="font-heading text-3xl font-semibold text-foreground">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card/90 shadow-xl shadow-black/5 ring-1 ring-black/6 backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserPlus className="size-5" />
            </div>
            <div className="space-y-2">
              <CardTitle className="font-heading text-2xl">
                Tạo tài khoản
              </CardTitle>
              <CardDescription>
                Thiết lập tài khoản quản trị để bắt đầu quản lý bảng đấu của
                câu lạc bộ.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Tên hiển thị</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ví dụ: Minh Hoàng"
                  required
                />
              </div>

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
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={cn(buttonVariants({ size: "lg" }), "w-full justify-center")}
              >
                {submitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                {!submitting && <ArrowRight className="size-4" />}
              </button>
            </form>

            <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Chuyển sang đăng nhập
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
