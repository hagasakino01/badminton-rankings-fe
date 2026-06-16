"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FolderKanban,
  LogOut,
  Plus,
  ShieldAlert,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { pushAppNotification } from "@/lib/app-feedback";
import { logoutSession, readSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Group } from "@/types/api";

export default function DashboardPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const hasSession = Boolean(readSession());

  async function loadGroups() {
    const response = await apiFetch<{ groups: Group[] }>("/groups", {
      requiresAuth: true,
    });
    setGroups(response.groups);
  }

  useEffect(() => {
    if (!hasSession) {
      router.push("/login");
      return;
    }
    let isMounted = true;

    async function bootstrap() {
      try {
        const response = await apiFetch<{ groups: Group[] }>("/groups", {
          requiresAuth: true,
        });
        if (!isMounted) return;
        setGroups(response.groups);
      } catch {
        if (!isMounted) return;
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [hasSession, router]);

  async function handleCreateGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSession) return;

    setSubmitting(true);

    try {
      await apiFetch("/groups", {
        method: "POST",
        requiresAuth: true,
        body: JSON.stringify({ name, description }),
      });

      setName("");
      setDescription("");
      pushAppNotification({
        title: "Tạo bảng thành công",
        message: "Bảng đấu mới đã được thêm vào dashboard.",
      });
      await loadGroups();
    } catch {
      return;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGroup(groupId: string, groupName: string) {
    if (!hasSession) return;

    const confirmed = window.confirm(
      `Xóa bảng "${groupName}" và toàn bộ dữ liệu liên quan?`,
    );
    if (!confirmed) return;

    setDeletingGroupId(groupId);

    try {
      await apiFetch(`/groups/${groupId}`, {
        method: "DELETE",
        requiresAuth: true,
      });

      pushAppNotification({
        title: "Đã xóa bảng đấu",
        message: `Bảng "${groupName}" đã được gỡ khỏi hệ thống.`,
        tone: "info",
      });
      await loadGroups();
    } catch {
      return;
    } finally {
      setDeletingGroupId(null);
    }
  }

  async function handleLogout() {
    await logoutSession();
    router.push("/login");
  }

  const totalPlayers = groups.reduce(
    (sum, group) => sum + (group.playerCount ?? 0),
    0,
  );
  const totalSeasons = groups.reduce(
    (sum, group) => sum + (group.seasonCount ?? 0),
    0,
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <Card className="border-0 bg-[linear-gradient(135deg,rgba(15,118,110,0.94),rgba(26,53,88,0.92))] text-primary-foreground shadow-2xl shadow-primary/15 ring-1 ring-white/10">
          <CardContent className="grid gap-6 px-5 py-6 sm:gap-8 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/12 text-white hover:bg-white/18">
                Dashboard
              </Badge>
              <Badge className="bg-white/10 text-white/75 hover:bg-white/15">
                Season management
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl font-heading text-3xl leading-none font-semibold tracking-tight text-balance sm:text-5xl">
                Điều phối các bảng đấu và mùa giải từ một mặt điều khiển duy
                nhất.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/78">
                Tạo group mới, theo dõi quy mô câu lạc bộ và đi thẳng vào mùa
                giải đang cần thao tác mà không phải rời khỏi dashboard.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-black/12 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                  Bảng đấu
                </p>
                <p className="mt-3 font-heading text-4xl font-semibold">
                  {groups.length}
                </p>
              </div>
              <div className="rounded-3xl bg-black/12 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                  Tổng VĐV
                </p>
                <p className="mt-3 font-heading text-4xl font-semibold">
                  {totalPlayers}
                </p>
              </div>
              <div className="rounded-3xl bg-black/12 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                  Mùa giải
                </p>
                <p className="mt-3 font-heading text-4xl font-semibold">
                  {totalSeasons}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card/90 shadow-xl shadow-black/5 ring-1 ring-black/6">
          <CardHeader className="space-y-3">
            <CardTitle className="font-heading text-2xl">
              Phiên làm việc
            </CardTitle>
            <CardDescription>
              Thoát tài khoản hiện tại hoặc tiếp tục mở rộng cấu trúc giải đấu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-border/70 bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              Dashboard này là điểm vào chính để tạo bảng, mở mùa, sinh session
              và đi sâu vào quản lý từng nhóm người chơi.
            </div>
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-center gap-2"
              onClick={() => void handleLogout()}
            >
              <LogOut className="size-4" />
              Đăng xuất
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Card className="border-0 bg-card/90 shadow-lg shadow-black/5 ring-1 ring-black/6">
          <CardHeader className="space-y-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Plus className="size-5" />
            </div>
            <div className="space-y-2">
              <CardTitle className="font-heading text-2xl">
                Tạo bảng đấu mới
              </CardTitle>
              <CardDescription>
                Mỗi bảng là một không gian riêng để quản lý roster, mùa giải và
                toàn bộ lịch sử thi đấu.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleCreateGroup}>
              <div className="space-y-2">
                <Label htmlFor="group-name">Tên bảng</Label>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ví dụ: CLB của tôi"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-description">Mô tả</Label>
                <Textarea
                  id="group-description"
                  rows={5}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Mô tả ngắn về nhóm, lịch chơi hoặc quy tắc riêng của bảng đấu."
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="w-full justify-center gap-2"
              >
                <FolderKanban className="size-4" />
                {submitting ? "Đang tạo bảng..." : "Tạo bảng"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Trophy, label: "Bảng đấu", value: groups.length },
              { icon: Users, label: "Tổng VĐV", value: totalPlayers },
              { icon: Swords, label: "Mùa giải", value: totalSeasons },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Card
                  key={item.label}
                  className="border-0 bg-card/88 shadow-lg shadow-black/5 ring-1 ring-black/6"
                >
                  <CardContent className="flex items-center gap-4 px-4 py-5">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="font-heading text-3xl font-semibold">
                        {item.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border-0 bg-card/90 shadow-lg shadow-black/5 ring-1 ring-black/6">
            <CardHeader className="space-y-2">
              <CardTitle className="font-heading text-2xl">
                Các bảng bạn đang quản lý
              </CardTitle>
              <CardDescription>
                Chọn một bảng để vào roster, season, session và bảng xếp hạng
                của riêng nhóm đó.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="rounded-3xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center text-sm text-muted-foreground">
                  Đang tải dữ liệu dashboard...
                </div>
              ) : groups.length ? (
                groups.map((group) => (
                  <Card
                    key={group._id}
                    className="border-0 bg-background/75 shadow-none ring-1 ring-black/6 transition-transform hover:-translate-y-0.5"
                    size="sm"
                  >
                    <CardHeader className="gap-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <CardTitle className="font-heading text-xl">
                            {group.name}
                          </CardTitle>
                          <CardDescription className="max-w-2xl text-sm leading-6">
                            {group.description ||
                              "Chưa có mô tả cho bảng đấu này."}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">
                          {group.playerCount ?? 0} người chơi
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span className="rounded-full bg-muted px-3 py-1">
                          Mùa giải: {group.seasonCount ?? 0}
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1">
                          Owner: bạn
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/groups/${group._id}`}
                          className={cn(
                            buttonVariants({ size: "default" }),
                            "w-full gap-2 sm:w-auto",
                          )}
                        >
                          Mở bảng
                          <ArrowRight className="size-4" />
                        </Link>
                        <Button
                          variant="destructive"
                          type="button"
                          onClick={() =>
                            handleDeleteGroup(group._id, group.name)
                          }
                          disabled={deletingGroupId === group._id}
                          className="w-full sm:w-auto"
                        >
                          {deletingGroupId === group._id
                            ? "Đang xóa..."
                            : "Xóa bảng"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center">
                  <ShieldAlert className="mx-auto mb-3 size-5 text-muted-foreground" />
                  <p className="text-sm font-medium">Chưa có bảng đấu nào.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Hãy tạo bảng đầu tiên để bắt đầu quản lý người chơi và mùa
                    giải.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
