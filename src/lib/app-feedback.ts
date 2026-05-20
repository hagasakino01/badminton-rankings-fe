"use client";

export type AppFeedbackNotificationTone = "success" | "info";

export type AppFeedbackNotification = {
  id: string;
  title: string;
  message?: string;
  tone: AppFeedbackNotificationTone;
  durationMs: number;
};

type AppFeedbackError = {
  id: string;
  title: string;
  message: string;
};

type AppFeedbackState = {
  pendingRequests: number;
  errorQueue: AppFeedbackError[];
  notifications: AppFeedbackNotification[];
};

type AppFeedbackNotificationInput = {
  title: string;
  message?: string;
  tone?: AppFeedbackNotificationTone;
  durationMs?: number;
};

const DEFAULT_NOTIFICATION_DURATION_MS = 3600;

const listeners = new Set<() => void>();

let state: AppFeedbackState = {
  pendingRequests: 0,
  errorQueue: [],
  notifications: [],
};

function canUseDOM() {
  return typeof window !== "undefined";
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function updateState(updater: (current: AppFeedbackState) => AppFeedbackState) {
  if (!canUseDOM()) {
    return;
  }

  state = updater(state);
  emitChange();
}

function createFeedbackId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function subscribeAppFeedback(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getAppFeedbackSnapshot() {
  return state;
}

export function beginAppRequest() {
  updateState((current) => ({
    ...current,
    pendingRequests: current.pendingRequests + 1,
  }));
}

export function endAppRequest() {
  updateState((current) => ({
    ...current,
    pendingRequests: Math.max(0, current.pendingRequests - 1),
  }));
}

export function showApiErrorModal(message: string, title = "Không thể xử lý yêu cầu") {
  updateState((current) => ({
    ...current,
    errorQueue: [
      ...current.errorQueue,
      {
        id: createFeedbackId("error"),
        title,
        message,
      },
    ],
  }));
}

export function dismissCurrentApiErrorModal() {
  updateState((current) => ({
    ...current,
    errorQueue: current.errorQueue.slice(1),
  }));
}

export function pushAppNotification({
  title,
  message,
  tone = "success",
  durationMs = DEFAULT_NOTIFICATION_DURATION_MS,
}: AppFeedbackNotificationInput) {
  const notification: AppFeedbackNotification = {
    id: createFeedbackId("notification"),
    title,
    message,
    tone,
    durationMs,
  };

  updateState((current) => ({
    ...current,
    notifications: [...current.notifications, notification],
  }));

  return notification.id;
}

export function dismissAppNotification(notificationId: string) {
  updateState((current) => ({
    ...current,
    notifications: current.notifications.filter(
      (notification) => notification.id !== notificationId,
    ),
  }));
}
