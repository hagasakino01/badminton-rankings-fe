"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  dismissAppNotification,
  dismissCurrentApiErrorModal,
  getAppFeedbackSnapshot,
  subscribeAppFeedback,
} from "@/lib/app-feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AppFeedbackProviderProps = {
  children: React.ReactNode;
};

function getServerSnapshot() {
  return {
    pendingRequests: 0,
    errorQueue: [],
    notifications: [],
  };
}

export function AppFeedbackProvider({ children }: AppFeedbackProviderProps) {
  const state = useSyncExternalStore(
    subscribeAppFeedback,
    getAppFeedbackSnapshot,
    getServerSnapshot,
  );
  const notificationTimeoutsRef = useRef(new Map<string, number>());
  const activeError = state.errorQueue[0];

  useEffect(() => {
    const activeNotificationIds = new Set(
      state.notifications.map((notification) => notification.id),
    );

    state.notifications.forEach((notification) => {
      if (notificationTimeoutsRef.current.has(notification.id)) {
        return;
      }

      const timeoutId = window.setTimeout(() => {
        dismissAppNotification(notification.id);
      }, notification.durationMs);

      notificationTimeoutsRef.current.set(notification.id, timeoutId);
    });

    notificationTimeoutsRef.current.forEach((timeoutId, notificationId) => {
      if (activeNotificationIds.has(notificationId)) {
        return;
      }

      window.clearTimeout(timeoutId);
      notificationTimeoutsRef.current.delete(notificationId);
    });
  }, [state.notifications]);

  useEffect(() => {
    const notificationTimeouts = notificationTimeoutsRef.current;

    return () => {
      notificationTimeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      notificationTimeouts.clear();
    };
  }, []);

  return (
    <>
      {children}

      {state.pendingRequests > 0 && (
        <div className="pointer-events-auto fixed inset-0 z-40">
          <div className="absolute inset-0 bg-background/72 backdrop-blur-sm" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-[32px] border border-border/70 bg-card/95 px-6 py-7 text-center shadow-2xl shadow-black/10 ring-1 ring-black/6">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LoaderCircle className="size-7 animate-spin" />
              </div>
              <p className="mt-5 font-heading text-2xl font-semibold tracking-tight">
                Đang xử lý
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Hệ thống đang gọi API và đồng bộ dữ liệu. Vui lòng chờ trong giây lát.
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex justify-center sm:left-auto sm:right-4 sm:top-5 sm:w-[24rem]"
      >
        <div className="flex w-full max-w-md flex-col gap-3">
          {state.notifications.map((notification) => {
            const NotificationIcon =
              notification.tone === "info" ? Info : CheckCircle2;

            return (
              <div
                key={notification.id}
                className="pointer-events-auto rounded-[28px] border border-border/70 bg-card/96 p-4 shadow-2xl shadow-black/10 ring-1 ring-black/6 backdrop-blur"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl ${
                      notification.tone === "info"
                        ? "bg-accent/18 text-accent-foreground"
                        : "bg-primary/12 text-primary"
                    }`}
                  >
                    <NotificationIcon className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{notification.title}</p>
                    {notification.message && (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {notification.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="-mr-1 -mt-1"
                    onClick={() => dismissAppNotification(notification.id)}
                  >
                    <X className="size-4" />
                    <span className="sr-only">Đóng thông báo</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog
        open={Boolean(activeError)}
        onOpenChange={(open) => {
          if (!open) {
            dismissCurrentApiErrorModal();
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-[30px] p-0">
          <DialogHeader className="px-6 pt-6">
            <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-destructive/12 text-destructive">
              <TriangleAlert className="size-5" />
            </div>
            <DialogTitle className="font-heading text-2xl">
              {activeError?.title ?? "Lỗi API"}
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-6">
              {activeError?.message ?? "Đã xảy ra lỗi khi gọi API."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="rounded-b-[30px]">
            <Button type="button" onClick={() => dismissCurrentApiErrorModal()}>
              Đã hiểu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
