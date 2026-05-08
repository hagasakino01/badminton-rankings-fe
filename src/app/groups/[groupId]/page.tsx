"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  Crown,
  Lock,
  Medal,
  Plus,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

import { SessionEditor } from "@/components/session-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { readSession } from "@/lib/auth";
import type { Group, Player, Season, SeasonDetail } from "@/types/api";

type GroupResponse = {
  group: Group;
  players: Player[];
  seasons: Season[];
};

function getSeasonBadgeVariant(season?: Season) {
  if (!season) return "outline" as const;
  if (season.isLocked || season.status === "completed") return "destructive" as const;
  if (season.status === "active") return "default" as const;
  return "secondary" as const;
}

export default function GroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();
  const groupId = params.groupId;

  const [groupData, setGroupData] = useState<GroupResponse | null>(null);
  const [seasonDetail, setSeasonDetail] = useState<SeasonDetail | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);
  const [playerForm, setPlayerForm] = useState({ fullName: "", nickname: "", contactInfo: "" });
  const [seasonName, setSeasonName] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [deletingSeason, setDeletingSeason] = useState(false);
  const token = readSession()?.token ?? null;

  const playerMap = useMemo(
    () =>
      Object.fromEntries(
        (groupData?.players ?? []).map((player) => [
          player._id,
          player.nickname ? `${player.fullName} (${player.nickname})` : player.fullName,
        ]),
      ),
    [groupData?.players],
  );

  const activePlayers = useMemo(
    () => (groupData?.players ?? []).filter((player) => player.status === "active"),
    [groupData?.players],
  );

  const hasEnoughParticipantsForSession = selectedParticipants.length >= 5;
  const currentSeason = seasonDetail?.season;
  const currentSeasonLocked = currentSeason?.isLocked ?? false;

  async function loadGroup(sessionToken: string) {
    const response = await apiFetch<GroupResponse>(`/groups/${groupId}`, { token: sessionToken });
    setGroupData(response);
    setSelectedParticipants((current) =>
      current.length
        ? current
        : response.players.filter((player) => player.status === "active").map((player) => player._id),
    );

    if (!selectedSeasonId && response.seasons[0]?._id) {
      setSelectedSeasonId(response.seasons[0]._id);
    }
  }

  async function loadSeason(sessionToken: string, seasonId: string) {
    const response = await apiFetch<SeasonDetail>(`/seasons/${seasonId}`, { token: sessionToken });
    setSeasonDetail(response);
  }

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    const sessionToken = token;
    let isMounted = true;

    async function bootstrap() {
      try {
        const response = await apiFetch<GroupResponse>(`/groups/${groupId}`, { token: sessionToken });
        if (!isMounted) return;

        setGroupData(response);
        setSelectedParticipants((current) =>
          current.length
            ? current
            : response.players.filter((player) => player.status === "active").map((player) => player._id),
        );

        if (!selectedSeasonId && response.seasons[0]?._id) {
          setSelectedSeasonId(response.seasons[0]._id);
        }
      } catch (error) {
        if (!isMounted) return;
        setStatus(error instanceof Error ? error.message : "Không thể tải bảng đấu.");
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [groupId, router, selectedSeasonId, token]);

  useEffect(() => {
    if (!token || !selectedSeasonId) return;

    const sessionToken = token;
    let isMounted = true;

    async function syncSeason() {
      try {
        const response = await apiFetch<SeasonDetail>(`/seasons/${selectedSeasonId}`, {
          token: sessionToken,
        });
        if (!isMounted) return;
        setSeasonDetail(response);
      } catch (error) {
        if (!isMounted) return;
        setStatus(error instanceof Error ? error.message : "Không thể tải mùa giải.");
      }
    }

    void syncSeason();

    return () => {
      isMounted = false;
    };
  }, [token, selectedSeasonId]);

  async function refreshAll(nextSeasonId?: string) {
    if (!token) return;
    await loadGroup(token);
    const seasonId = nextSeasonId ?? selectedSeasonId;
    if (seasonId) {
      await loadSeason(token, seasonId);
    }
  }

  async function handleAddPlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setStatus(null);
    try {
      await apiFetch(`/groups/${groupId}/players`, {
        method: "POST",
        token,
        body: JSON.stringify(playerForm),
      });

      setPlayerForm({ fullName: "", nickname: "", contactInfo: "" });
      await refreshAll();
      setStatus("Đã thêm vận động viên.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể thêm vận động viên.");
    }
  }

  async function handleCreateSeason(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setStatus(null);
    try {
      const response = await apiFetch<{ season: Season }>(`/seasons/groups/${groupId}/seasons`, {
        method: "POST",
        token,
        body: JSON.stringify({ name: seasonName }),
      });

      setSeasonName("");
      setSelectedSeasonId(response.season._id);
      await refreshAll(response.season._id);
      setStatus("Đã tạo mùa giải.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể tạo mùa giải.");
    }
  }

  async function handleGenerateSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedSeasonId) return;

    if (!hasEnoughParticipantsForSession) {
      setStatus("Cần chọn ít nhất 5 người tham gia để tạo buổi thi đấu.");
      return;
    }

    setStatus(null);
    try {
      await apiFetch(`/seasons/${selectedSeasonId}/sessions`, {
        method: "POST",
        token,
        body: JSON.stringify({
          scheduledFor: sessionDate,
          participantIds: selectedParticipants,
        }),
      });

      await refreshAll();
      setStatus("Đã tạo buổi thi đấu.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể tạo buổi thi đấu.");
    }
  }

  async function handleFinalizeSeason() {
    if (!token || !selectedSeasonId) return;

    setStatus(null);
    try {
      await apiFetch(`/seasons/${selectedSeasonId}/finalize`, {
        method: "POST",
        token,
      });

      await refreshAll();
      setStatus("Mùa giải đã được khóa và tổng kết.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể tổng kết mùa giải.");
    }
  }

  async function handleDeleteGroup() {
    if (!token || !groupData) return;

    const confirmed = window.confirm(
      `Xóa bảng "${groupData.group.name}" cùng toàn bộ mùa giải, buổi đấu và kết quả?`,
    );
    if (!confirmed) return;

    setDeletingGroup(true);
    setStatus(null);

    try {
      await apiFetch(`/groups/${groupId}`, {
        method: "DELETE",
        token,
      });

      router.push("/dashboard");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể xóa bảng đấu.");
      setDeletingGroup(false);
    }
  }

  async function handleDeleteSeason() {
    if (!token || !seasonDetail) return;

    const confirmed = window.confirm(
      `Xóa mùa giải "${seasonDetail.season.name}" và toàn bộ session/match của mùa này?`,
    );
    if (!confirmed) return;

    setDeletingSeason(true);
    setStatus(null);

    try {
      await apiFetch(`/seasons/${seasonDetail.season._id}`, {
        method: "DELETE",
        token,
      });

      const remainingSeasons = (groupData?.seasons ?? []).filter(
        (season) => season._id !== seasonDetail.season._id,
      );
      const nextSeasonId = remainingSeasons[0]?._id ?? "";

      setSeasonDetail(null);
      setSelectedSeasonId(nextSeasonId);
      await refreshAll(nextSeasonId || undefined);
      setStatus("Đã xóa mùa giải.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể xóa mùa giải.");
    } finally {
      setDeletingSeason(false);
    }
  }

  async function handleSessionChanged() {
    await refreshAll();
  }

  const topPlayer = seasonDetail?.rankings.rows[0];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <Card className="border-0 bg-[linear-gradient(135deg,rgba(15,118,110,0.94),rgba(26,53,88,0.92))] text-primary-foreground shadow-2xl shadow-primary/15 ring-1 ring-white/10">
          <CardContent className="grid gap-8 px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/12 text-white hover:bg-white/18">Chi tiết bảng đấu</Badge>
              <Badge className="bg-white/10 text-white/75 hover:bg-white/15">
                {groupData?.players.length ?? 0} vận động viên
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="font-heading text-4xl leading-none font-semibold tracking-tight text-balance sm:text-5xl">
                {groupData?.group.name ?? "Đang tải bảng đấu..."}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/78">
                {groupData?.group.description ||
                  "Quản lý roster, mùa giải, session và bảng xếp hạng cho nhóm cầu lông của bạn."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-black/12 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Active players</p>
                <p className="mt-3 font-heading text-4xl font-semibold">{activePlayers.length}</p>
              </div>
              <div className="rounded-3xl bg-black/12 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Seasons</p>
                <p className="mt-3 font-heading text-4xl font-semibold">{groupData?.seasons.length ?? 0}</p>
              </div>
              <div className="rounded-3xl bg-black/12 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Top hiện tại</p>
                <p className="mt-3 text-lg font-semibold">{topPlayer?.fullName ?? "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card/90 shadow-xl shadow-black/5 ring-1 ring-black/6">
          <CardHeader className="space-y-3">
            <CardTitle className="font-heading text-2xl">Tình trạng bảng</CardTitle>
            <CardDescription>
              Theo dõi mùa đang chọn, người dẫn đầu và thao tác nguy hiểm liên quan tới toàn bộ bảng đấu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-border/70 bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Mùa đang xem</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={getSeasonBadgeVariant(currentSeason)}>
                  {currentSeason ? currentSeason.status : "Chưa chọn mùa"}
                </Badge>
                {currentSeason?.isLocked && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="size-3.5" />
                    locked
                  </Badge>
                )}
              </div>
            </div>

            <Button
              variant="destructive"
              size="lg"
              type="button"
              onClick={handleDeleteGroup}
              disabled={deletingGroup}
              className="w-full justify-center"
            >
              {deletingGroup ? "Đang xóa bảng..." : "Xóa toàn bộ bảng đấu"}
            </Button>
          </CardContent>
        </Card>
      </section>

      {status && (
        <Alert>
          <AlertTitle>Thông báo</AlertTitle>
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="gap-6">
        <TabsList variant="line" className="h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="overview" className="rounded-t-xl px-4 py-3">
            Tổng quan
          </TabsTrigger>
          <TabsTrigger value="players" className="rounded-t-xl px-4 py-3">
            Vận động viên
          </TabsTrigger>
          <TabsTrigger value="sessions" className="rounded-t-xl px-4 py-3">
            Buổi đấu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className="border-0 bg-card/90 shadow-lg shadow-black/5 ring-1 ring-black/6">
              <CardHeader className="space-y-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Plus className="size-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="font-heading text-2xl">Tạo và chọn mùa giải</CardTitle>
                  <CardDescription>
                    Mỗi bảng chỉ nên có một mùa mở tại một thời điểm. Sau khi khóa mùa, bạn có thể tạo mùa mới.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-4" onSubmit={handleCreateSeason}>
                  <div className="space-y-2">
                    <Label htmlFor="seasonName">Tên mùa giải</Label>
                    <Input
                      id="seasonName"
                      value={seasonName}
                      onChange={(event) => setSeasonName(event.target.value)}
                      placeholder="Ví dụ: Mùa Xuân 2026"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full justify-center">
                    Tạo mùa giải
                  </Button>
                </form>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" />
                    <p className="text-sm font-medium">Danh sách mùa</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(groupData?.seasons ?? []).length ? (
                      groupData?.seasons.map((season) => (
                        <Button
                          key={season._id}
                          type="button"
                          variant={season._id === selectedSeasonId ? "default" : "outline"}
                          onClick={() => setSelectedSeasonId(season._id)}
                        >
                          {season.name}
                        </Button>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
                        Chưa có mùa giải nào.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/90 shadow-lg shadow-black/5 ring-1 ring-black/6">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <CardTitle className="font-heading text-2xl">
                      {currentSeason?.name ?? "Chọn một mùa để xem chi tiết"}
                    </CardTitle>
                    <CardDescription>
                      Theo dõi trạng thái mùa, tổng số session/match và các hành động khóa hoặc xóa mùa.
                    </CardDescription>
                  </div>
                  {currentSeason && <Badge variant={getSeasonBadgeVariant(currentSeason)}>{currentSeason.status}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentSeason ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                        <p className="text-sm text-muted-foreground">Buổi đấu</p>
                        <p className="mt-2 font-heading text-3xl font-semibold">
                          {seasonDetail?.rankings.totals.sessions ?? 0}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                        <p className="text-sm text-muted-foreground">Trận đấu</p>
                        <p className="mt-2 font-heading text-3xl font-semibold">
                          {seasonDetail?.rankings.totals.matches ?? 0}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                        <p className="text-sm text-muted-foreground">Top 1</p>
                        <p className="mt-2 text-lg font-semibold">{topPlayer?.fullName ?? "-"}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={handleFinalizeSeason}
                        disabled={currentSeasonLocked}
                        className="flex-1"
                      >
                        {currentSeasonLocked ? "Mùa đã khóa" : "Tổng kết mùa"}
                      </Button>
                      <Button
                        variant="destructive"
                        type="button"
                        onClick={handleDeleteSeason}
                        disabled={deletingSeason}
                        className="flex-1"
                      >
                        {deletingSeason ? "Đang xóa..." : "Xóa mùa"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-3xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center text-sm text-muted-foreground">
                    Chọn một mùa giải để xem thống kê và quản trị mùa hiện tại.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Card className="border-0 bg-card/90 shadow-lg shadow-black/5 ring-1 ring-black/6">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-2">
                <Medal className="size-5 text-primary" />
                <CardTitle className="font-heading text-2xl">Bảng xếp hạng hiện tại</CardTitle>
              </div>
              <CardDescription>
                Dữ liệu được cộng dồn theo mùa đang chọn, bao gồm điểm, số trận, số buổi và số lần vắng.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {seasonDetail ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Vận động viên</TableHead>
                      <TableHead>Điểm</TableHead>
                      <TableHead>W-L</TableHead>
                      <TableHead>Tỷ lệ thắng</TableHead>
                      <TableHead>Hiệu số</TableHead>
                      <TableHead>Buổi</TableHead>
                      <TableHead>Vắng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seasonDetail.rankings.rows.map((row) => (
                      <TableRow key={row.playerId}>
                        <TableCell>{row.rank}</TableCell>
                        <TableCell>{row.nickname ? `${row.fullName} (${row.nickname})` : row.fullName}</TableCell>
                        <TableCell>{row.points}</TableCell>
                        <TableCell>
                          {row.wins}-{row.losses}
                        </TableCell>
                        <TableCell>{Math.round(row.winRate * 100)}%</TableCell>
                        <TableCell>{row.scoreDifference}</TableCell>
                        <TableCell>{row.sessionsAttended}</TableCell>
                        <TableCell>{row.absences}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center text-sm text-muted-foreground">
                  Chưa có dữ liệu xếp hạng cho mùa này.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="space-y-6">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className="border-0 bg-card/90 shadow-lg shadow-black/5 ring-1 ring-black/6">
              <CardHeader className="space-y-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Users className="size-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="font-heading text-2xl">Thêm vận động viên</CardTitle>
                  <CardDescription>
                    Giữ roster gọn gàng và đầy đủ trước khi bắt đầu tạo season hoặc sinh lịch session.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleAddPlayer}>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Họ tên</Label>
                    <Input
                      id="fullName"
                      value={playerForm.fullName}
                      onChange={(event) =>
                        setPlayerForm((current) => ({ ...current, fullName: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Biệt danh</Label>
                    <Input
                      id="nickname"
                      value={playerForm.nickname}
                      onChange={(event) =>
                        setPlayerForm((current) => ({ ...current, nickname: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactInfo">Liên hệ</Label>
                    <Input
                      id="contactInfo"
                      value={playerForm.contactInfo}
                      onChange={(event) =>
                        setPlayerForm((current) => ({ ...current, contactInfo: event.target.value }))
                      }
                    />
                  </div>
                  <Button type="submit" className="w-full justify-center">
                    Thêm người chơi
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/90 shadow-lg shadow-black/5 ring-1 ring-black/6">
              <CardHeader className="space-y-3">
                <CardTitle className="font-heading text-2xl">Roster hiện tại</CardTitle>
                <CardDescription>
                  Theo dõi danh sách active/inactive và tổng quy mô bảng để đảm bảo đủ điều kiện tạo mùa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="mt-2 font-heading text-3xl font-semibold">{activePlayers.length}</p>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                    <p className="text-sm text-muted-foreground">Inactive</p>
                    <p className="mt-2 font-heading text-3xl font-semibold">
                      {(groupData?.players.length ?? 0) - activePlayers.length}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                    <p className="text-sm text-muted-foreground">Giới hạn</p>
                    <p className="mt-2 font-heading text-3xl font-semibold">20</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {(groupData?.players ?? []).map((player) => (
                    <div
                      key={player._id}
                      className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background/75 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{player.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.nickname || player.contactInfo || "Chưa có ghi chú thêm."}
                        </p>
                      </div>
                      <Badge variant={player.status === "active" ? "default" : "secondary"}>{player.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card className="border-0 bg-card/90 shadow-lg shadow-black/5 ring-1 ring-black/6">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-2">
                <Swords className="size-5 text-primary" />
                <CardTitle className="font-heading text-2xl">Tạo buổi đấu mới</CardTitle>
              </div>
              <CardDescription>
                Chọn ít nhất 5 người tham gia để sinh lịch thi đấu. Nếu mùa đã khóa, việc tạo buổi mới sẽ bị vô hiệu hóa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleGenerateSession}>
                <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="sessionDate">Ngày thi đấu</Label>
                    <Input
                      id="sessionDate"
                      type="date"
                      value={sessionDate}
                      onChange={(event) => setSessionDate(event.target.value)}
                      required
                    />
                    <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
                      Đã chọn <span className="font-medium text-foreground">{selectedParticipants.length}</span> người
                      tham gia cho session này.
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Chọn người tham gia</Label>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {activePlayers.map((player) => {
                        const checked = selectedParticipants.includes(player._id);

                        return (
                          <label
                            key={player._id}
                            className="flex cursor-pointer items-start gap-3 rounded-3xl border border-border/70 bg-background/75 p-4 transition-colors hover:bg-muted/30"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(nextChecked) =>
                                setSelectedParticipants((current) =>
                                  nextChecked
                                    ? [...current, player._id]
                                    : current.filter((item) => item !== player._id),
                                )
                              }
                              disabled={currentSeasonLocked}
                            />
                            <div className="space-y-1">
                              <p className="font-medium">{playerMap[player._id]}</p>
                              <p className="text-sm text-muted-foreground">{player.contactInfo || "Sẵn sàng thi đấu"}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {!hasEnoughParticipantsForSession && (
                  <Alert>
                    <AlertTitle>Chưa đủ điều kiện tạo session</AlertTitle>
                    <AlertDescription>
                      Cần chọn ít nhất 5 người tham gia để tạo buổi thi đấu.
                    </AlertDescription>
                  </Alert>
                )}

                {currentSeasonLocked && (
                  <Alert>
                    <AlertTitle>Mùa hiện tại đã khóa</AlertTitle>
                    <AlertDescription>
                      Bạn không thể tạo thêm buổi đấu cho mùa đã được tổng kết.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={!selectedSeasonId || !hasEnoughParticipantsForSession || currentSeasonLocked}
                  className="w-full justify-center sm:w-auto"
                >
                  Sinh lịch thi đấu
                </Button>
              </form>
            </CardContent>
          </Card>

          <section className="grid gap-4">
            {seasonDetail?.sessions.length ? (
              seasonDetail.sessions.map((session) => (
                <SessionEditor
                  key={`${session._id}-${session.isResultsSaved}-${session.matches
                    .map((match) => `${match._id}:${match.scoreA ?? ""}-${match.scoreB ?? ""}`)
                    .join("|")}`}
                  token={token ?? ""}
                  session={session}
                  seasonLocked={seasonDetail.season.isLocked}
                  playerMap={playerMap}
                  onChanged={handleSessionChanged}
                />
              ))
            ) : (
              <Card className="border-0 bg-card/90 shadow-lg shadow-black/5 ring-1 ring-black/6">
                <CardContent className="px-6 py-10 text-center">
                  <CalendarDays className="mx-auto mb-3 size-5 text-muted-foreground" />
                  <p className="font-medium">Chưa có buổi thi đấu nào trong mùa này.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tạo session đầu tiên để bắt đầu sinh lịch và nhập kết quả.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </TabsContent>
      </Tabs>

      {seasonDetail && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Trophy, label: "Top 1", value: topPlayer?.fullName ?? "-" },
            { icon: CalendarDays, label: "Tổng buổi", value: String(seasonDetail.rankings.totals.sessions) },
            { icon: Swords, label: "Tổng trận", value: String(seasonDetail.rankings.totals.matches) },
            { icon: Crown, label: "Trạng thái", value: seasonDetail.season.status },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.label} className="border-0 bg-card/88 shadow-lg shadow-black/5 ring-1 ring-black/6">
                <CardContent className="flex items-center gap-4 px-4 py-5">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="truncate font-medium">{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </main>
  );
}
