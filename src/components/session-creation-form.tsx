"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ClipboardCheck,
  Plus,
  Sparkles,
  Swords,
  Trash2,
  Users,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { pushAppNotification } from "@/lib/app-feedback";
import {
  createEmptyManualMatch,
  type ManualMatchDraft,
  validateManualSchedule,
} from "@/lib/manual-schedule";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SessionCreationFormProps = {
  selectedSeasonId: string;
  currentSeasonLocked: boolean;
  activePlayers: Player[];
  playerMap: Record<string, string>;
  onCreated: () => Promise<void> | void;
};

type StatusState = {
  type: "success" | "error";
  message: string;
};

type ManualMatchTeamKey = "teamAIds" | "teamBIds";

const selectClassName =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50";

function buildPlayerCountLabel(
  playerId: string,
  count: number,
  playerMap: Record<string, string>,
) {
  return `${playerMap[playerId] ?? "Unknown player"} ${count}/4`;
}

export function SessionCreationForm({
  selectedSeasonId,
  currentSeasonLocked,
  activePlayers,
  playerMap,
  onCreated,
}: SessionCreationFormProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [sessionDate, setSessionDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [scheduleType, setScheduleType] = useState<"auto" | "manual">("auto");
  const [selectedParticipantsState, setSelectedParticipantsState] = useState<string[]>(
    [],
  );
  const [participantsCustomized, setParticipantsCustomized] = useState(false);
  const [manualMatches, setManualMatches] = useState<ManualMatchDraft[]>([]);
  const [status, setStatus] = useState<StatusState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activePlayerIds = useMemo(
    () => activePlayers.map((player) => player._id),
    [activePlayers],
  );

  const selectedParticipants = useMemo(() => {
    const activePlayerIdSet = new Set(activePlayerIds);
    const filtered = selectedParticipantsState.filter((playerId) =>
      activePlayerIdSet.has(playerId),
    );

    return participantsCustomized ? filtered : activePlayerIds;
  }, [activePlayerIds, participantsCustomized, selectedParticipantsState]);

  const normalizedManualMatches = useMemo(() => {
    const participantSet = new Set(selectedParticipants);

    return manualMatches.map((match) => ({
      ...match,
      teamAIds: match.teamAIds.map((playerId) =>
        playerId && !participantSet.has(playerId) ? "" : playerId,
      ) as [string, string],
      teamBIds: match.teamBIds.map((playerId) =>
        playerId && !participantSet.has(playerId) ? "" : playerId,
      ) as [string, string],
    }));
  }, [manualMatches, selectedParticipants]);

  const manualValidation = useMemo(
    () => validateManualSchedule(selectedParticipants, normalizedManualMatches),
    [normalizedManualMatches, selectedParticipants],
  );

  const hasEnoughParticipants = selectedParticipants.length >= 5;
  const manualParticipantLimitExceeded =
    scheduleType === "manual" && selectedParticipants.length > 12;
  const canCreateSession =
    Boolean(selectedSeasonId) && !currentSeasonLocked && hasEnoughParticipants;
  const remainingBlankMatches = Math.max(
    manualValidation.requiredMatchCount - manualMatches.length,
    0,
  );

  function formatPlayerIssues(players: Array<{ playerId: string; count: number }>) {
    return players
      .map((item) => buildPlayerCountLabel(item.playerId, item.count, playerMap))
      .join(", ");
  }

  function getManualValidationError() {
    if (!hasEnoughParticipants) {
      return "Cần chọn ít nhất 5 người tham gia để tạo lịch thủ công.";
    }

    if (selectedParticipants.length > 12) {
      return "Lịch thủ công chỉ hỗ trợ tối đa 12 người tham gia.";
    }

    if (manualMatches.length !== selectedParticipants.length) {
      return `Lịch chưa hợp lệ. Với ${selectedParticipants.length} người tham gia, cần tạo đúng ${selectedParticipants.length} trận.`;
    }

    if (manualValidation.matchIssues.length) {
      return manualValidation.matchIssues[0];
    }

    if (manualValidation.extraPlayers.length) {
      return `Không thể lưu lịch. Các người chơi này đang vượt quá 4 trận: ${formatPlayerIssues(manualValidation.extraPlayers)}.`;
    }

    if (manualValidation.missingPlayers.length) {
      return `Không thể lưu lịch. Các người chơi này chưa đủ 4 trận: ${formatPlayerIssues(manualValidation.missingPlayers)}.`;
    }

    return null;
  }

  function buildManualValidationSuccessMessage() {
    return `Lịch hợp lệ. ${selectedParticipants.length} người tham gia, ${manualMatches.length} trận và tất cả đều đủ 4 trận.`;
  }

  function ensureInitialManualMatches() {
    if (!selectedParticipants.length) {
      setManualMatches([]);
      return;
    }

    setManualMatches((current) =>
      current.length
        ? current
        : Array.from({ length: selectedParticipants.length }, () => createEmptyManualMatch()),
    );
  }

  function handleScheduleTypeChange(nextType: "auto" | "manual") {
    setScheduleType(nextType);
    setStatus(null);

    if (nextType === "manual") {
      ensureInitialManualMatches();
    }
  }

  function handleParticipantToggle(playerId: string, nextChecked: boolean) {
    setParticipantsCustomized(true);
    setStatus(null);

    setSelectedParticipantsState((current) => {
      if (nextChecked) {
        if (scheduleType === "manual" && !current.includes(playerId) && current.length >= 12) {
          setStatus({
            type: "error",
            message: "Lịch thủ công chỉ hỗ trợ tối đa 12 người tham gia.",
          });
          return current;
        }

        if (current.includes(playerId)) {
          return current;
        }

        return [...current, playerId];
      }

      return current.filter((item) => item !== playerId);
    });
  }

  function updateManualMatch(
    matchId: string,
    teamKey: ManualMatchTeamKey,
    slotIndex: number,
    playerId: string,
  ) {
    setStatus(null);
    setManualMatches((current) =>
      current.map((match) => {
        if (match.id !== matchId) {
          return match;
        }

        const nextTeam = [...match[teamKey]] as [string, string];
        nextTeam[slotIndex] = playerId;

        return {
          ...match,
          [teamKey]: nextTeam,
        };
      }),
    );
  }

  function handleAddManualMatch() {
    setStatus(null);
    setManualMatches((current) => [...current, createEmptyManualMatch()]);
  }

  function handleFillRequiredMatches() {
    if (!remainingBlankMatches) {
      return;
    }

    setStatus(null);
    setManualMatches((current) => [
      ...current,
      ...Array.from({ length: remainingBlankMatches }, () => createEmptyManualMatch()),
    ]);
  }

  function handleRemoveManualMatch(matchId: string) {
    setStatus(null);
    setManualMatches((current) => current.filter((match) => match.id !== matchId));
  }

  function handleMoveManualMatch(matchId: string, direction: "up" | "down") {
    setStatus(null);
    setManualMatches((current) => {
      const index = current.findIndex((match) => match.id === matchId);
      if (index < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [movedMatch] = next.splice(index, 1);
      next.splice(targetIndex, 0, movedMatch);
      return next;
    });
  }

  function handleCheckManualSchedule() {
    const validationError = getManualValidationError();

    if (validationError) {
      setStatus({
        type: "error",
        message: validationError,
      });
      return;
    }

    setStatus({
      type: "success",
      message: buildManualValidationSuccessMessage(),
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSeasonId) {
      return;
    }

    if (!hasEnoughParticipants) {
      setStatus({
        type: "error",
        message: "Cần chọn ít nhất 5 người tham gia để tạo buổi thi đấu.",
      });
      return;
    }

    if (scheduleType === "manual") {
      const validationError = getManualValidationError();
      if (validationError) {
        setStatus({
          type: "error",
          message: validationError,
        });
        return;
      }
    }

    setSubmitting(true);
    setStatus(null);

    try {
      await apiFetch(`/seasons/${selectedSeasonId}/sessions`, {
        method: "POST",
        requiresAuth: true,
        body: JSON.stringify({
          title: title.trim() || undefined,
          note: note.trim() || undefined,
          scheduledFor: sessionDate,
          participantIds: selectedParticipants,
          scheduleType,
          manualMatches:
            scheduleType === "manual"
              ? normalizedManualMatches.map((match) => ({
                  teamAIds: match.teamAIds,
                  teamBIds: match.teamBIds,
                }))
              : undefined,
        }),
      });

      setTitle("");
      setNote("");
      pushAppNotification({
        title: "Tạo buổi thi đấu thành công",
        message:
          scheduleType === "manual"
            ? "Session mới đã được tạo với lịch thủ công."
            : "Session mới đã được tạo với lịch tự động.",
      });

      if (scheduleType === "manual") {
        setManualMatches(
          Array.from({ length: selectedParticipants.length }, () => createEmptyManualMatch()),
        );
      } else {
        setManualMatches([]);
      }

      await onCreated();
    } catch {
      return;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-0 bg-card/90 shadow-lg shadow-black/5 ring-1 ring-black/6">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Swords className="size-5 text-primary" />
          <CardTitle className="font-heading text-2xl">Tạo buổi thi đấu mới</CardTitle>
        </div>
        <CardDescription>
          Chọn người tham gia và chế độ tạo lịch. Với chế độ thủ công, bạn tự xếp từng
          trận và hệ thống chỉ cho lưu khi tất cả người chơi đều đúng 4 trận.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="sessionTitle">Tên buổi thi đấu</Label>
              <Input
                id="sessionTitle"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ví dụ: Buổi thi đấu ngày 18/05/2026"
                maxLength={120}
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionDate">Ngày thi đấu</Label>
              <Input
                id="sessionDate"
                type="date"
                value={sessionDate}
                onChange={(event) => setSessionDate(event.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionNote">Ghi chú</Label>
            <Textarea
              id="sessionNote"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Thông tin sân, lưu ý chia cặp hoặc ghi chú khác cho buổi này."
              maxLength={500}
              disabled={submitting}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
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
                          handleParticipantToggle(player._id, Boolean(nextChecked))
                        }
                        disabled={currentSeasonLocked || submitting}
                      />
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{playerMap[player._id]}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.contactInfo || "Sẵn sàng thi đấu"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-border/70 bg-muted/35 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="size-4 text-primary" />
                Tóm tắt session
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Người tham gia:{" "}
                  <span className="font-medium text-foreground">
                    {selectedParticipants.length}
                  </span>
                </p>
                <p>
                  Chế độ:{" "}
                  <span className="font-medium text-foreground">
                    {scheduleType === "manual" ? "Thủ công" : "Tự động"}
                  </span>
                </p>
                {scheduleType === "manual" && (
                  <p>
                    Số trận cần tạo:{" "}
                    <span className="font-medium text-foreground">
                      {manualValidation.requiredMatchCount}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Chế độ tạo lịch</Label>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => handleScheduleTypeChange("auto")}
                className={cn(
                  "rounded-3xl border p-4 text-left transition-colors",
                  scheduleType === "auto"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/70 bg-background/75 hover:bg-muted/30",
                )}
                disabled={currentSeasonLocked || submitting}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Sparkles className="size-4 text-primary" />
                  Tạo lịch tự động
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Hệ thống tự chia cặp theo thuật toán hiện tại và tạo sẵn danh sách trận.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleScheduleTypeChange("manual")}
                className={cn(
                  "rounded-3xl border p-4 text-left transition-colors",
                  scheduleType === "manual"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/70 bg-background/75 hover:bg-muted/30",
                )}
                disabled={currentSeasonLocked || submitting}
              >
                <div className="flex items-center gap-2 font-medium">
                  <ClipboardCheck className="size-4 text-primary" />
                  Tạo lịch thủ công
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Tự chọn từng trận, mỗi trận gồm 2 đội và hệ thống kiểm tra số trận của
                  từng người theo thời gian thực.
                </p>
              </button>
            </div>
          </div>

          {!hasEnoughParticipants && (
            <Alert>
              <AlertTitle>Chưa đủ điều kiện tạo session</AlertTitle>
              <AlertDescription>
                Cần chọn ít nhất 5 người tham gia để tạo buổi thi đấu.
              </AlertDescription>
            </Alert>
          )}

          {manualParticipantLimitExceeded && (
            <Alert variant="destructive">
              <AlertTitle>Vượt quá giới hạn lịch thủ công</AlertTitle>
              <AlertDescription>
                Lịch thủ công hiện chỉ hỗ trợ tối đa 12 người tham gia. Hãy bỏ bớt người
                chơi hoặc chuyển sang lịch tự động.
              </AlertDescription>
            </Alert>
          )}

          {currentSeasonLocked && (
            <Alert>
              <AlertTitle>Mùa hiện tại đã khóa</AlertTitle>
              <AlertDescription>
                Bạn không thể tạo thêm buổi thi đấu cho mùa đã được tổng kết.
              </AlertDescription>
            </Alert>
          )}

          {scheduleType === "manual" && (
            <div className="space-y-6 rounded-[28px] border border-border/70 bg-background/70 p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Lịch thủ công</p>
                  <p className="text-sm text-muted-foreground">
                    Tạo đúng {manualValidation.requiredMatchCount} trận, mỗi người đúng 4
                    trận.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCheckManualSchedule}
                    disabled={submitting}
                    className="w-full sm:w-auto"
                  >
                    <CalendarDays className="size-4" />
                    Kiểm tra lịch
                  </Button>
                  {remainingBlankMatches > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFillRequiredMatches}
                      disabled={submitting}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="size-4" />
                      Bù đủ {remainingBlankMatches} trận
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddManualMatch}
                    disabled={submitting}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="size-4" />
                    Thêm trận
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-border/70 bg-muted/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Tiến độ người chơi</p>
                      <Badge variant={manualValidation.isValid ? "default" : "outline"}>
                        {manualValidation.currentMatchCount}/{manualValidation.requiredMatchCount}{" "}
                        trận
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {selectedParticipants.map((playerId) => {
                        const matchCount = manualValidation.playerCounts[playerId] ?? 0;

                        return (
                          <div
                            key={playerId}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/75 px-3 py-2"
                          >
                            <span className="min-w-0 break-words text-sm font-medium">
                              {playerMap[playerId]}
                            </span>
                            <Badge
                              variant={
                                matchCount > 4
                                  ? "destructive"
                                  : matchCount === 4
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {matchCount}/4
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {manualValidation.warnings.length > 0 && (
                    <div className="rounded-3xl border border-border/70 bg-muted/35 p-4">
                      <p className="text-sm font-medium">Cảnh báo cân bằng</p>
                      <div className="mt-3 grid gap-2">
                        {manualValidation.warnings.slice(0, 6).map((warning) => (
                          <p
                            key={`${warning.type}-${warning.playerIds.join("-")}`}
                            className="text-sm leading-6 text-muted-foreground"
                          >
                            {playerMap[warning.playerIds[0]] ?? warning.playerIds[0]} và{" "}
                            {playerMap[warning.playerIds[1]] ?? warning.playerIds[1]}{" "}
                            {warning.type === "teammate"
                              ? `đã đứng cùng đội ${warning.count} lần.`
                              : `đã gặp nhau ${warning.count} lần với vai trò đối thủ.`}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {normalizedManualMatches.length ? (
                    normalizedManualMatches.map((match, index) => {
                      const slots = [
                        {
                          teamKey: "teamAIds" as const,
                          slotIndex: 0,
                          value: match.teamAIds[0],
                        },
                        {
                          teamKey: "teamAIds" as const,
                          slotIndex: 1,
                          value: match.teamAIds[1],
                        },
                        {
                          teamKey: "teamBIds" as const,
                          slotIndex: 0,
                          value: match.teamBIds[0],
                        },
                        {
                          teamKey: "teamBIds" as const,
                          slotIndex: 1,
                          value: match.teamBIds[1],
                        },
                      ];

                      return (
                        <div
                          key={match.id}
                          className="rounded-3xl border border-border/70 bg-background/75 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Trận {index + 1}</Badge>
                              <p className="text-sm text-muted-foreground">
                                2 đội, mỗi đội 2 người
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => handleMoveManualMatch(match.id, "up")}
                                disabled={index === 0 || submitting}
                              >
                                <ArrowUp className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => handleMoveManualMatch(match.id, "down")}
                                disabled={index === normalizedManualMatches.length - 1 || submitting}
                              >
                                <ArrowDown className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon-sm"
                                onClick={() => handleRemoveManualMatch(match.id)}
                                disabled={submitting}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div className="space-y-3 rounded-3xl border border-border/60 bg-muted/30 p-4">
                              <p className="text-sm font-medium">Đội 1</p>
                              {[0, 1].map((slotIndex) => (
                                <select
                                  key={`team-a-${slotIndex}`}
                                  value={match.teamAIds[slotIndex]}
                                  onChange={(event) =>
                                    updateManualMatch(
                                      match.id,
                                      "teamAIds",
                                      slotIndex,
                                      event.target.value,
                                    )
                                  }
                                  className={selectClassName}
                                  disabled={submitting}
                                >
                                  <option value="">Chọn người chơi</option>
                                  {selectedParticipants.map((playerId) => {
                                    const currentValue = match.teamAIds[slotIndex];
                                    const alreadyUsedInMatch = slots.some(
                                      (slot) =>
                                        slot.value === playerId &&
                                        !(slot.teamKey === "teamAIds" &&
                                          slot.slotIndex === slotIndex),
                                    );
                                    const playerCount =
                                      manualValidation.playerCounts[playerId] ?? 0;

                                    return (
                                      <option
                                        key={playerId}
                                        value={playerId}
                                        disabled={
                                          alreadyUsedInMatch ||
                                          (currentValue !== playerId && playerCount >= 4)
                                        }
                                      >
                                        {playerMap[playerId]} ({playerCount}/4)
                                      </option>
                                    );
                                  })}
                                </select>
                              ))}
                            </div>

                            <div className="space-y-3 rounded-3xl border border-border/60 bg-muted/30 p-4">
                              <p className="text-sm font-medium">Đội 2</p>
                              {[0, 1].map((slotIndex) => (
                                <select
                                  key={`team-b-${slotIndex}`}
                                  value={match.teamBIds[slotIndex]}
                                  onChange={(event) =>
                                    updateManualMatch(
                                      match.id,
                                      "teamBIds",
                                      slotIndex,
                                      event.target.value,
                                    )
                                  }
                                  className={selectClassName}
                                  disabled={submitting}
                                >
                                  <option value="">Chọn người chơi</option>
                                  {selectedParticipants.map((playerId) => {
                                    const currentValue = match.teamBIds[slotIndex];
                                    const alreadyUsedInMatch = slots.some(
                                      (slot) =>
                                        slot.value === playerId &&
                                        !(slot.teamKey === "teamBIds" &&
                                          slot.slotIndex === slotIndex),
                                    );
                                    const playerCount =
                                      manualValidation.playerCounts[playerId] ?? 0;

                                    return (
                                      <option
                                        key={playerId}
                                        value={playerId}
                                        disabled={
                                          alreadyUsedInMatch ||
                                          (currentValue !== playerId && playerCount >= 4)
                                        }
                                      >
                                        {playerMap[playerId]} ({playerCount}/4)
                                      </option>
                                    );
                                  })}
                                </select>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-3xl border border-dashed border-border bg-muted/25 px-5 py-10 text-center text-sm text-muted-foreground">
                      Chưa có trận nào trong lịch thủ công. Hãy thêm trận hoặc bù đủ số
                      trận cần thiết.
                    </div>
                  )}
                </div>
              </div>

              {(manualValidation.matchIssues.length > 0 ||
                manualValidation.missingPlayers.length > 0 ||
                manualValidation.extraPlayers.length > 0) && (
                <Alert variant="destructive">
                  <AlertTitle>Lịch thủ công chưa hợp lệ</AlertTitle>
                  <AlertDescription>
                    {manualValidation.matchIssues[0] ||
                      (manualValidation.extraPlayers.length
                        ? `Người chơi vượt quá 4 trận: ${formatPlayerIssues(
                            manualValidation.extraPlayers,
                          )}.`
                        : `Người chơi chưa đủ 4 trận: ${formatPlayerIssues(
                            manualValidation.missingPlayers,
                          )}.`)}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {status && (
            <Alert variant={status.type === "error" ? "destructive" : "default"}>
              <AlertTitle>Trạng thái tạo session</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              size="lg"
              disabled={!canCreateSession || submitting || manualParticipantLimitExceeded}
              className="w-full justify-center sm:w-auto"
            >
              {scheduleType === "manual"
                ? submitting
                  ? "Đang lưu lịch thủ công..."
                  : "Lưu lịch thủ công"
                : submitting
                  ? "Đang sinh lịch..."
                  : "Sinh lịch thi đấu"}
            </Button>
            <p className="text-sm leading-6 text-muted-foreground">
              {scheduleType === "manual"
                ? "Mỗi người chơi phải xuất hiện đúng 4 trận. Hệ thống sẽ chặn lưu nếu lịch chưa hợp lệ."
                : "Lịch tự động sẽ dùng danh sách người chơi đã chọn và tạo toàn bộ trận cho session này."}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
