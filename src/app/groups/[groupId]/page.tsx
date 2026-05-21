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

import { SessionCreationForm } from "@/components/session-creation-form";
import { SessionEditor } from "@/components/session-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, apiFetch } from "@/lib/api";
import { pushAppNotification, showApiErrorModal } from "@/lib/app-feedback";
import { readSession } from "@/lib/auth";
import type { Group, Player, Season, SeasonDetail } from "@/types/api";

type GroupResponse = {
  group: Group;
  players: Player[];
  seasons: Season[];
};

type PlayerMutationResponse = {
  player: Player;
  message: string;
};

type GroupPageTab = "overview" | "players" | "sessions";

const CREATE_SEASON_PLAYER_REQUIREMENT_MESSAGE =
  "Để tạo mùa giải, nhóm của bạn cần có từ 5 đến 20 thành viên ở trạng thái hoạt động.";

const SESSION_TAB_SEASON_REQUIREMENT_MESSAGE =
  "Bạn cần có mùa giải để có thể tạo và theo dõi câc trận đấu";

function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (/fetch|network/i.test(error.message)) {
      return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  return "Đã xảy ra lỗi khi gọi API.";
}

function getSeasonBadgeVariant(season?: Season) {
  if (!season) return "outline" as const;
  if (season.isLocked || season.status === "completed")
    return "destructive" as const;
  if (season.status === "active") return "default" as const;
  return "secondary" as const;
}

function getPlayerStatusLabel(status: Player["status"]) {
  return status === "active" ? "Hoạt động" : "Không hoạt động";
}

function getSeasonStatusLabel(status?: Season["status"]) {
  if (status === "active") return "Hoạt động";
  if (status === "completed") return "Hoàn tất";
  if (status === "draft") return "Chưa khởi động";
  return "Chưa chọn mùa";
}

function getSeasonListButtonClass(season: Season, isSelected: boolean) {
  if (isSelected) {
    return "";
  }

  const toneClass =
    season.status === "completed"
      ? "border-[#F5C5C7] bg-[#F5C5C7] hover:bg-[#efb4b7]"
      : season.status === "draft"
        ? "border-[#FAF2E4] bg-[#FAF2E4] hover:bg-[#f2e7d4]"
        : "border-[#CCF1D5] bg-[#CCF1D5] hover:bg-[#bce7c8]";

  return `${toneClass} text-foreground hover:text-foreground`;
}

export default function GroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();
  const groupId = params.groupId;

  const [groupData, setGroupData] = useState<GroupResponse | null>(null);
  const [seasonDetail, setSeasonDetail] = useState<SeasonDetail | null>(null);
  const [activeTab, setActiveTab] = useState<GroupPageTab>("overview");
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [playerForm, setPlayerForm] = useState({
    fullName: "",
    nickname: "",
    contactInfo: "",
  });
  const [seasonName, setSeasonName] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [updatingPlayerId, setUpdatingPlayerId] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [deletingSeason, setDeletingSeason] = useState(false);
  const token = readSession()?.token ?? null;

  const playerMap = useMemo(
    () =>
      Object.fromEntries(
        (groupData?.players ?? []).map((player) => [
          player._id,
          player.nickname
            ? `${player.fullName} (${player.nickname})`
            : player.fullName,
        ]),
      ),
    [groupData?.players],
  );

  const activePlayers = useMemo(
    () =>
      (groupData?.players ?? []).filter((player) => player.status === "active"),
    [groupData?.players],
  );
  const hasActiveSeason = useMemo(
    () =>
      (groupData?.seasons ?? []).some((season) => season.status === "active"),
    [groupData?.seasons],
  );
  const hasAnySeason = (groupData?.seasons.length ?? 0) > 0;
  const inactivePlayerCount =
    (groupData?.players.length ?? 0) - activePlayers.length;
  const hasReachedActiveLimit = activePlayers.length >= 20;

  const currentSeason = seasonDetail?.season;
  const currentSeasonLocked = currentSeason?.isLocked ?? false;
  const topPlayer = seasonDetail?.rankings.rows[0];
  const rankingRows = seasonDetail?.rankings.rows ?? [];

  async function loadGroup(sessionToken: string) {
    const response = await apiFetch<GroupResponse>(`/groups/${groupId}`, {
      token: sessionToken,
    });

    setGroupData(response);

    if (!selectedSeasonId && response.seasons[0]?._id) {
      setSelectedSeasonId(response.seasons[0]._id);
    }

    return response;
  }

  async function loadSeason(sessionToken: string, seasonId: string) {
    const response = await apiFetch<SeasonDetail>(`/seasons/${seasonId}`, {
      token: sessionToken,
    });
    setSeasonDetail(response);
    return response;
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
        const response = await apiFetch<GroupResponse>(`/groups/${groupId}`, {
          token: sessionToken,
        });
        if (!isMounted) return;

        setGroupData(response);

        if (!selectedSeasonId && response.seasons[0]?._id) {
          setSelectedSeasonId(response.seasons[0]._id);
        }
      } catch {
        if (!isMounted) return;
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [groupId, router, selectedSeasonId, token]);

  useEffect(() => {
    if (!token || !selectedSeasonId) {
      return;
    }

    const sessionToken = token;
    let isMounted = true;

    async function syncSeason() {
      try {
        const response = await apiFetch<SeasonDetail>(
          `/seasons/${selectedSeasonId}`,
          {
            token: sessionToken,
          },
        );
        if (!isMounted) return;
        setSeasonDetail(response);
      } catch {
        if (!isMounted) return;
      }
    }

    void syncSeason();

    return () => {
      isMounted = false;
    };
  }, [selectedSeasonId, token]);

  async function refreshAll(nextSeasonId?: string) {
    if (!token) {
      return;
    }

    await loadGroup(token);

    const seasonId = nextSeasonId ?? selectedSeasonId;
    if (seasonId) {
      await loadSeason(token, seasonId);
    }
  }

  async function handleAddPlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setAddingPlayer(true);

    try {
      const response = await apiFetch<PlayerMutationResponse>(
        `/groups/${groupId}/players`,
        {
          method: "POST",
          token,
          body: JSON.stringify(playerForm),
        },
      );

      setPlayerForm({ fullName: "", nickname: "", contactInfo: "" });
      pushAppNotification({
        title: "Thêm thành viên thành công",
        message: response.message,
        tone: response.player.status === "active" ? "success" : "info",
      });
      await refreshAll();
    } catch {
      return;
    } finally {
      setAddingPlayer(false);
    }
  }

  async function handleTogglePlayerStatus(player: Player) {
    if (!token) {
      return;
    }

    const nextStatus = player.status === "active" ? "inactive" : "active";
    setUpdatingPlayerId(player._id);

    try {
      const response = await apiFetch<PlayerMutationResponse>(
        `/groups/${groupId}/players/${player._id}/status`,
        {
          method: "PATCH",
          token,
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      pushAppNotification({
        title: "Cập nhật trạng thái thành công",
        message: response.message,
        tone: nextStatus === "active" ? "success" : "info",
      });
      await refreshAll();
    } catch {
      return;
    } finally {
      setUpdatingPlayerId(null);
    }
  }

  async function handleCreateSeason(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    if (activePlayers.length < 5 || activePlayers.length > 20) {
      showApiErrorModal(
        CREATE_SEASON_PLAYER_REQUIREMENT_MESSAGE,
        undefined,
        () => setActiveTab("players"),
      );
      return;
    }

    try {
      const response = await apiFetch<{ season: Season }>(
        `/seasons/groups/${groupId}/seasons`,
        {
          method: "POST",
          token,
          showErrorModal: false,
          body: JSON.stringify({ name: seasonName }),
        },
      );

      setSeasonName("");
      setSelectedSeasonId(response.season._id);
      pushAppNotification({
        title: "Tạo mùa giải thành công",
        message: `Mùa "${response.season.name}" đã sẵn sàng để sử dụng.`,
      });
      await refreshAll(response.season._id);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return;
      }

      const message = getApiErrorMessage(error);

      showApiErrorModal(
        message,
        undefined,
        message === CREATE_SEASON_PLAYER_REQUIREMENT_MESSAGE
          ? () => setActiveTab("players")
          : undefined,
      );

      return;
    }
  }

  async function handleFinalizeSeason() {
    if (!token || !selectedSeasonId) {
      return;
    }

    try {
      await apiFetch(`/seasons/${selectedSeasonId}/finalize`, {
        method: "POST",
        token,
      });

      pushAppNotification({
        title: "Đã tổng kết mùa giải",
        message: "Mùa giải hiện tại đã được khóa và chốt bảng xếp hạng.",
        tone: "info",
      });
      await refreshAll();
    } catch {
      return;
    }
  }

  async function handleDeleteGroup() {
    if (!token || !groupData) {
      return;
    }

    const confirmed = window.confirm(
      `Xóa bảng "${groupData.group.name}" cùng toàn bộ mùa giải, buổi đấu và kết quả?`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingGroup(true);

    try {
      await apiFetch(`/groups/${groupId}`, {
        method: "DELETE",
        token,
      });

      pushAppNotification({
        title: "Đã xóa bảng đấu",
        message: `Bảng "${groupData.group.name}" đã được xóa.`,
        tone: "info",
      });
      router.push("/dashboard");
    } catch {
      return;
    } finally {
      setDeletingGroup(false);
    }
  }

  async function handleDeleteSeason() {
    if (!token || !seasonDetail) {
      return;
    }

    const confirmed = window.confirm(
      `Xóa mùa "${seasonDetail.season.name}" và toàn bộ session/trận của mùa này?`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingSeason(true);

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
      pushAppNotification({
        title: "Đã xóa mùa giải",
        message: `Mùa "${seasonDetail.season.name}" đã được gỡ khỏi bảng đấu.`,
        tone: "info",
      });
      await refreshAll(nextSeasonId || undefined);
    } catch {
      return;
    } finally {
      setDeletingSeason(false);
    }
  }

  async function handleSessionChanged() {
    await refreshAll();
  }

  function handleTabChange(value: string) {
    const nextTab = value as GroupPageTab;

    if (nextTab === "sessions" && !hasAnySeason) {
      showApiErrorModal(SESSION_TAB_SEASON_REQUIREMENT_MESSAGE, undefined, () =>
        setActiveTab("overview"),
      );
      return;
    }

    setActiveTab(nextTab);
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <Card className="border-0 bg-[linear-gradient(135deg,rgba(15,118,110,0.94),rgba(26,53,88,0.92))] text-primary-foreground shadow-2xl shadow-primary/15 ring-1 ring-white/10">
          <CardContent className="grid gap-6 px-5 py-6 sm:gap-8 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/12 text-white hover:bg-white/18">
                Chi tiết bảng đấu
              </Badge>
              <Badge className="bg-white/10 text-white/75 hover:bg-white/15">
                {groupData?.players.length ?? 0} vận động viên
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="font-heading text-3xl leading-none font-semibold tracking-tight text-balance sm:text-5xl">
                {groupData?.group.name ?? "Đang tải bảng đấu..."}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/78">
                {groupData?.group.description ||
                  "Quản lý roster, mùa giải, session và bảng xếp hạng cho nhóm cầu lông của bạn."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-black/12 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                  Thành viên hoạt động
                </p>
                <p className="mt-3 font-heading text-4xl font-semibold">
                  {activePlayers.length}
                </p>
              </div>
              <div className="rounded-3xl bg-black/12 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                  Seasons
                </p>
                <p className="mt-3 font-heading text-4xl font-semibold">
                  {groupData?.seasons.length ?? 0}
                </p>
              </div>
              <div className="rounded-3xl bg-black/12 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                  Top hiện tại
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {topPlayer?.fullName ?? "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card/90 shadow-xl shadow-black/5 ring-1 ring-black/6">
          <CardHeader className="space-y-3">
            <CardTitle className="font-heading text-2xl">
              Tình trạng bảng
            </CardTitle>
            <CardDescription>
              Theo dõi mùa đang chọn, người dẫn đầu và các thao tác quản trị
              quan trọng.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-border/70 bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Mùa đang xem</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Tên mùa giải đang xem: {currentSeason?.name ?? "Chưa chọn mùa giải"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={getSeasonBadgeVariant(currentSeason)}>
                  {getSeasonStatusLabel(currentSeason?.status)}
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-6">
        <div className="overflow-x-auto no-scrollbar">
          <TabsList
            variant="line"
            className="h-auto w-max min-w-full justify-start gap-1 rounded-none border-b bg-transparent p-0"
          >
            <TabsTrigger
              value="overview"
              className="flex-none rounded-t-xl px-4 py-3"
            >
              Tổng quan
            </TabsTrigger>
            <TabsTrigger
              value="players"
              className="flex-none rounded-t-xl px-4 py-3"
            >
              Vận động viên
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="flex-none rounded-t-xl px-4 py-3"
            >
              Buổi đấu
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className="border-0 bg-card/90 shadow-lg shadow-black/5 ring-1 ring-black/6">
              <CardHeader className="space-y-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Plus className="size-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="font-heading text-2xl">
                    Tạo và chọn mùa giải
                  </CardTitle>
                  <CardDescription>
                    Mỗi bảng chỉ nên có một mùa mở tại một thời điểm. Sau khi
                    khóa mùa, bạn có thể tạo mùa mới.
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
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {(groupData?.seasons ?? []).length ? (
                      groupData?.seasons.map((season) => (
                        <Button
                          key={season._id}
                          type="button"
                          variant={
                            season._id === selectedSeasonId
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setSelectedSeasonId(season._id)}
                          className={`shrink-0 ${getSeasonListButtonClass(
                            season,
                            season._id === selectedSeasonId,
                          )}`}
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
                      Theo dõi trạng thái mùa, tổng số session/match và các hành
                      động khóa hoặc xóa mùa.
                    </CardDescription>
                  </div>
                  {currentSeason && (
                    <Badge variant={getSeasonBadgeVariant(currentSeason)}>
                      {getSeasonStatusLabel(currentSeason.status)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentSeason ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                        <p className="text-sm text-muted-foreground">
                          Buổi đấu
                        </p>
                        <p className="mt-2 font-heading text-3xl font-semibold">
                          {seasonDetail?.rankings.totals.sessions ?? 0}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                        <p className="text-sm text-muted-foreground">
                          Trận đấu
                        </p>
                        <p className="mt-2 font-heading text-3xl font-semibold">
                          {seasonDetail?.rankings.totals.matches ?? 0}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                        <p className="text-sm text-muted-foreground">Top 1</p>
                        <p className="mt-2 text-lg font-semibold">
                          {topPlayer?.fullName ?? "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={handleFinalizeSeason}
                        disabled={currentSeasonLocked}
                        className="w-full flex-1"
                      >
                        {currentSeasonLocked ? "Mùa đã khóa" : "Tổng kết mùa"}
                      </Button>
                      <Button
                        variant="destructive"
                        type="button"
                        onClick={handleDeleteSeason}
                        disabled={deletingSeason}
                        className="w-full flex-1"
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
                <CardTitle className="font-heading text-2xl">
                  Bảng xếp hạng hiện tại
                </CardTitle>
              </div>
              <CardDescription>
                Dữ liệu được cộng dồn theo mùa đang chọn, bao gồm điểm, số trận,
                số buổi và số lần vắng.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {seasonDetail && rankingRows.length ? (
                <>
                  <div className="grid gap-3 md:hidden">
                    {rankingRows.map((row) => (
                      <div
                        key={row.playerId}
                        className="rounded-3xl border border-border/70 bg-background/75 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="text-xs uppercase tracking-[0.22em] text-primary">
                              Hạng {row.rank}
                            </p>
                            <p className="break-words font-medium">
                              {row.nickname
                                ? `${row.fullName} (${row.nickname})`
                                : row.fullName}
                            </p>
                          </div>
                          <Badge variant="secondary">{row.points} điểm</Badge>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl bg-muted/35 px-3 py-2">
                            <p className="text-muted-foreground">W-L</p>
                            <p className="mt-1 font-medium">
                              {row.wins}-{row.losses}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-muted/35 px-3 py-2">
                            <p className="text-muted-foreground">Tỷ lệ thắng</p>
                            <p className="mt-1 font-medium">
                              {Math.round(row.winRate * 100)}%
                            </p>
                          </div>
                          <div className="rounded-2xl bg-muted/35 px-3 py-2">
                            <p className="text-muted-foreground">Hiệu số</p>
                            <p className="mt-1 font-medium">
                              {row.scoreDifference}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-muted/35 px-3 py-2">
                            <p className="text-muted-foreground">Buổi / vắng</p>
                            <p className="mt-1 font-medium">
                              {row.sessionsAttended} / {row.absences}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block">
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
                        {rankingRows.map((row) => (
                          <TableRow key={row.playerId}>
                            <TableCell>{row.rank}</TableCell>
                            <TableCell>
                              {row.nickname
                                ? `${row.fullName} (${row.nickname})`
                                : row.fullName}
                            </TableCell>
                            <TableCell>{row.points}</TableCell>
                            <TableCell>
                              {row.wins}-{row.losses}
                            </TableCell>
                            <TableCell>
                              {Math.round(row.winRate * 100)}%
                            </TableCell>
                            <TableCell>{row.scoreDifference}</TableCell>
                            <TableCell>{row.sessionsAttended}</TableCell>
                            <TableCell>{row.absences}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
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
                  <CardTitle className="font-heading text-2xl">
                    Thêm vận động viên
                  </CardTitle>
                  <CardDescription>
                    Giữ roster gọn gàng và đầy đủ trước khi bắt đầu tạo mùa hoặc
                    sinh lịch.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTitle>
                    {hasActiveSeason
                      ? "Thành viên mới sẽ được thêm dưới dạng không hoạt động"
                      : hasReachedActiveLimit
                        ? "Đã chạm giới hạn 20 thành viên hoạt động"
                        : "Thành viên mới sẽ được thêm dưới dạng hoạt động"}
                  </AlertTitle>
                  <AlertDescription>
                    {hasActiveSeason
                      ? "Bảng đấu đang có mùa giải hoạt động. Thành viên mới sẽ ở trạng thái không hoạt động và chưa thể tham gia mùa hiện tại."
                      : hasReachedActiveLimit
                        ? "Roster đã có đủ 20 thành viên hoạt động. Thành viên mới vẫn được lưu, nhưng sẽ ở trạng thái không hoạt động cho đến khi bạn giảm bớt số thành viên hoạt động."
                        : "Hiện không có mùa giải hoạt động, nên thành viên mới sẽ sẵn sàng cho các mùa hoặc buổi thi đấu tiếp theo ngay sau khi được thêm."}
                  </AlertDescription>
                </Alert>
                <form className="space-y-4" onSubmit={handleAddPlayer}>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Họ tên</Label>
                    <Input
                      id="fullName"
                      value={playerForm.fullName}
                      onChange={(event) =>
                        setPlayerForm((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
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
                        setPlayerForm((current) => ({
                          ...current,
                          nickname: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactInfo">Liên hệ</Label>
                    <Input
                      id="contactInfo"
                      value={playerForm.contactInfo}
                      onChange={(event) =>
                        setPlayerForm((current) => ({
                          ...current,
                          contactInfo: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full justify-center"
                    disabled={addingPlayer}
                  >
                    {addingPlayer
                      ? "Đang thêm thành viên..."
                      : "Thêm người chơi"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/90 shadow-lg shadow-black/5 ring-1 ring-black/6">
              <CardHeader className="space-y-3">
                <CardTitle className="font-heading text-2xl">
                  Roster hiện tại
                </CardTitle>
                <CardDescription>
                  Theo dõi danh sách hoạt động/không hoạt động và tổng quy mô
                  bảng để đảm bảo đủ điều kiện tạo mùa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                    <p className="text-sm text-muted-foreground">Hoạt động</p>
                    <p className="mt-2 font-heading text-3xl font-semibold">
                      {activePlayers.length}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                    <p className="text-sm text-muted-foreground">
                      Không hoạt động
                    </p>
                    <p className="mt-2 font-heading text-3xl font-semibold">
                      {inactivePlayerCount}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                    <p className="text-sm text-muted-foreground">Giới hạn</p>
                    <p className="mt-2 font-heading text-3xl font-semibold">
                      20
                    </p>
                  </div>
                </div>

                {hasActiveSeason ? (
                  <Alert>
                    <AlertTitle>Đang có mùa giải hoạt động</AlertTitle>
                    <AlertDescription>
                      Bạn chưa thể chuyển thành viên giữa trạng thái hoạt
                      động/không hoạt động cho đến khi mùa hiện tại kết thúc.
                    </AlertDescription>
                  </Alert>
                ) : hasReachedActiveLimit ? (
                  <Alert>
                    <AlertTitle>
                      Roster đã đạt tối đa 20 thành viên hoạt động
                    </AlertTitle>
                    <AlertDescription>
                      Bạn vẫn có thể chuyển từ hoạt động sang không hoạt động.
                      Để kích hoạt thêm thành viên khác, hãy giảm bớt số thành
                      viên hoạt động hiện tại.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-3">
                  {(groupData?.players ?? []).map((player) => (
                    <div
                      key={player._id}
                      className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background/75 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{player.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.nickname ||
                            player.contactInfo ||
                            "Chưa có ghi chú thêm."}
                        </p>
                      </div>
                      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        <Badge
                          variant={
                            player.status === "active" ? "default" : "secondary"
                          }
                        >
                          {getPlayerStatusLabel(player.status)}
                        </Badge>
                        {hasActiveSeason ? (
                          <span className="text-sm text-muted-foreground"></span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              player.status === "active" ? "outline" : "default"
                            }
                            className="w-full sm:w-auto"
                            disabled={
                              updatingPlayerId === player._id ||
                              (player.status === "inactive" &&
                                hasReachedActiveLimit)
                            }
                            onClick={() => handleTogglePlayerStatus(player)}
                          >
                            {updatingPlayerId === player._id
                              ? "Đang cập nhật..."
                              : player.status === "active"
                                ? "Dừng hoạt động"
                                : "Kích hoạt"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <SessionCreationForm
            token={token}
            selectedSeasonId={selectedSeasonId}
            currentSeasonLocked={currentSeasonLocked}
            activePlayers={activePlayers}
            playerMap={playerMap}
            onCreated={handleSessionChanged}
          />

          <section className="grid gap-4">
            {seasonDetail?.sessions.length ? (
              seasonDetail.sessions.map((session) => (
                <SessionEditor
                  key={`${session._id}-${session.isResultsSaved}-${session.matches
                    .map(
                      (match) =>
                        `${match._id}:${match.scoreA ?? ""}-${match.scoreB ?? ""}`,
                    )
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
                  <p className="font-medium">
                    Chưa có buổi thi đấu nào trong mùa này.
                  </p>
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
            {
              icon: CalendarDays,
              label: "Tổng buổi",
              value: String(seasonDetail.rankings.totals.sessions),
            },
            {
              icon: Swords,
              label: "Tổng trận",
              value: String(seasonDetail.rankings.totals.matches),
            },
            {
              icon: Crown,
              label: "Trạng thái",
              value: getSeasonStatusLabel(seasonDetail.season.status),
            },
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
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">
                      {item.label}
                    </p>
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
