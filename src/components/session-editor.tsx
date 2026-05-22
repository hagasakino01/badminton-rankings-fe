"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Lock, Save, Trash2, Users } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { pushAppNotification } from "@/lib/app-feedback";
import { cn } from "@/lib/utils";
import type { Match, Session } from "@/types/api";

type SessionEditorProps = {
  session: Session;
  seasonLocked: boolean;
  playerMap: Record<string, string>;
  onChanged: () => Promise<void> | void;
};

type DraftState = Record<string, { scoreA: string; scoreB: string }>;
type StatusState = {
  type: "success" | "error";
  message: string;
};

function buildInitialDraft(matches: Match[]) {
  return matches.reduce<DraftState>((accumulator, match) => {
    accumulator[match._id] = {
      scoreA: match.scoreA?.toString() ?? "",
      scoreB: match.scoreB?.toString() ?? "",
    };
    return accumulator;
  }, {});
}

export function SessionEditor({
  session,
  seasonLocked,
  playerMap,
  onChanged,
}: SessionEditorProps) {
  const [draft, setDraft] = useState<DraftState>(() =>
    buildInitialDraft(session.matches),
  );
  const [status, setStatus] = useState<StatusState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const isLocked = seasonLocked || session.isResultsSaved;

  const summary = useMemo(
    () =>
      session.participantIds
        .map((playerId) => playerMap[playerId] ?? "Unknown player")
        .join(", "),
    [playerMap, session.participantIds],
  );

  function buildResults() {
    const results = session.matches.map((match) => ({
      matchId: match._id,
      scoreA: draft[match._id]?.scoreA?.trim() ?? "",
      scoreB: draft[match._id]?.scoreB?.trim() ?? "",
    }));

    if (results.some((item) => item.scoreA === "" || item.scoreB === "")) {
      setStatus({
        type: "error",
        message:
          "Vui lòng nhập đầy đủ kết quả của tất cả các trận đấu để lưu kết quả.",
      });
      return null;
    }

    const normalizedResults = results.map((item) => ({
      matchId: item.matchId,
      scoreA: Number(item.scoreA),
      scoreB: Number(item.scoreB),
    }));

    if (
      normalizedResults.some(
        (item) =>
          Number.isNaN(item.scoreA) ||
          Number.isNaN(item.scoreB) ||
          item.scoreA < 0 ||
          item.scoreB < 0 ||
          !Number.isInteger(item.scoreA) ||
          !Number.isInteger(item.scoreB),
      )
    ) {
      setStatus({
        type: "error",
        message: "Điểm số phải là số nguyên không âm.",
      });
      return null;
    }

    if (normalizedResults.some((item) => item.scoreA === item.scoreB)) {
      setStatus({
        type: "error",
        message: "Mỗi trận phải có đội thắng, không hỗ trợ kết quả hòa.",
      });
      return null;
    }

    return normalizedResults;
  }

  function handleOpenConfirm() {
    if (isLocked) {
      return;
    }

    const results = buildResults();
    if (!results) {
      return;
    }

    setStatus(null);
    setIsConfirmOpen(true);
  }

  async function handleSave() {
    const results = buildResults();
    if (!results) {
      setIsConfirmOpen(false);
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      await apiFetch(`/sessions/${session._id}/results`, {
        method: "POST",
        requiresAuth: true,
        body: JSON.stringify({ results }),
      });

      pushAppNotification({
        title: "Lưu kết quả thành công",
        message: "Buổi thi đấu đã được chốt kết quả.",
      });
      setIsConfirmOpen(false);
      await onChanged();
    } catch {
      return;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (isLocked) {
      return;
    }

    const confirmed = window.confirm(
      "Xóa buổi thi đấu này? Các trận trong buổi sẽ bị xóa theo.",
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setStatus(null);

    try {
      await apiFetch(`/sessions/${session._id}`, {
        method: "DELETE",
        requiresAuth: true,
      });

      pushAppNotification({
        title: "Đã xóa buổi thi đấu",
        message: "Session và toàn bộ trận trong buổi này đã được xóa.",
        tone: "info",
      });
      await onChanged();
    } catch {
      return;
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="border-0 bg-card/88 shadow-lg shadow-black/5 ring-1 ring-black/6">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <CalendarDays className="size-3.5" />
                  {new Date(session.scheduledFor).toLocaleDateString("vi-VN")}
                </Badge>
                <Badge variant="outline">
                  {session.scheduleType === "manual"
                    ? "Lịch thủ công"
                    : "Lịch tự động"}
                </Badge>
                <Badge variant={session.isResultsSaved ? "default" : "secondary"}>
                  {session.isResultsSaved
                    ? "Đã lưu kết quả"
                    : "Chưa lưu kết quả"}
                </Badge>
                <Badge variant="outline">{session.matches.length} trận</Badge>
              </div>
              <div className="min-w-0 space-y-2">
                <CardTitle className="font-heading text-2xl">
                  {session.title || "Buổi thi đấu"}
                </CardTitle>
                <div className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                  <Users className="mt-1 size-4 shrink-0" />
                  <p>{summary}</p>
                </div>
                {session.note && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {session.note}
                  </p>
                )}
                {!!session.absentPlayerIds.length && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Vắng:{" "}
                    {session.absentPlayerIds
                      .map((playerId) => playerMap[playerId] ?? "Unknown player")
                      .join(", ")}
                  </p>
                )}
              </div>
            </div>

            {isLocked && (
              <div className="rounded-3xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <Lock className="mr-2 inline size-4 text-primary" />
                Kết quả buổi đấu đã được chốt.
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {session.matches.map((match) => (
              <div
                key={match._id}
                className="grid gap-4 rounded-3xl border border-border/70 bg-background/75 p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-primary">
                    Trận {match.courtOrder}
                  </p>
                  <p className="font-medium">
                    {match.teamAIds
                      .map((playerId) => playerMap[playerId] ?? "Unknown")
                      .join(" / ")}
                  </p>
                  <p className="text-sm text-muted-foreground">vs</p>
                  <p className="font-medium">
                    {match.teamBIds
                      .map((playerId) => playerMap[playerId] ?? "Unknown")
                      .join(" / ")}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start rounded-2xl border border-border/60 bg-muted/25 px-3 py-2 sm:self-center sm:border-0 sm:bg-transparent sm:p-0">
                  <Input
                    inputMode="numeric"
                    type="number"
                    min={0}
                    value={draft[match._id]?.scoreA ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [match._id]: {
                          ...current[match._id],
                          scoreA: event.target.value,
                        },
                      }))
                    }
                    disabled={isLocked || submitting}
                    className={cn(
                      "h-11 w-20 text-center text-base",
                      isLocked && "bg-muted/40",
                    )}
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    :
                  </span>
                  <Input
                    inputMode="numeric"
                    type="number"
                    min={0}
                    value={draft[match._id]?.scoreB ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [match._id]: {
                          ...current[match._id],
                          scoreB: event.target.value,
                        },
                      }))
                    }
                    disabled={isLocked || submitting}
                    className={cn(
                      "h-11 w-20 text-center text-base",
                      isLocked && "bg-muted/40",
                    )}
                  />
                </div>
              </div>
            ))}
          </div>

          {status && (
            <Alert variant={status.type === "error" ? "destructive" : "default"}>
              <AlertTitle>Trạng thái buổi đấu</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm leading-6 text-muted-foreground">
            Sau khi xác nhận lưu, kết quả của buổi này sẽ bị khóa và không thể
            chỉnh sửa lại.
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {!session.isResultsSaved && !seasonLocked && (
              <Button
                variant="destructive"
                type="button"
                onClick={handleDelete}
                disabled={deleting || submitting}
                className="w-full sm:w-auto"
              >
                <Trash2 className="size-4" />
                {deleting ? "Đang xóa..." : "Xóa buổi thi đấu"}
              </Button>
            )}
            <Button
              type="button"
              onClick={handleOpenConfirm}
              disabled={isLocked || submitting}
              className="w-full sm:w-auto"
            >
              <Save className="size-4" />
              {session.isResultsSaved
                ? "Đã lưu kết quả"
                : submitting
                  ? "Đang lưu..."
                  : "Lưu kết quả"}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isConfirmOpen} onOpenChange={(open) => setIsConfirmOpen(open)}>
        <DialogContent
          showCloseButton={!submitting}
          className="max-w-lg rounded-3xl p-0"
        >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="font-heading text-2xl">
              Bạn chắc chắn muốn lưu kết quả buổi thi đấu này?
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-6">
              Sau khi xác nhận, kết quả sẽ được chốt và bạn sẽ không thể chỉnh
              sửa hoặc xóa buổi thi đấu này nữa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="rounded-b-3xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button type="button" onClick={handleSave} disabled={submitting}>
              {submitting ? "Đang lưu..." : "Xác nhận lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
