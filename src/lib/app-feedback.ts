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

type AppFeedbackErrorDismissHandler = () => void;

const DEFAULT_NOTIFICATION_DURATION_MS = 3600;

const listeners = new Set<() => void>();
const errorDismissHandlers = new Map<string, AppFeedbackErrorDismissHandler>();

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

export function showApiErrorModal(
  message: string,
  title = "Không thể xử lý yêu cầu",
  onDismiss?: AppFeedbackErrorDismissHandler,
) {
  if (!canUseDOM()) {
    return;
  }

  const errorId = createFeedbackId("error");

  if (onDismiss) {
    errorDismissHandlers.set(errorId, onDismiss);
  }

  updateState((current) => ({
    ...current,
    errorQueue: [
      ...current.errorQueue,
      {
        id: errorId,
        title,
        message,
      },
    ],
  }));
}

export function dismissCurrentApiErrorModal() {
  if (!canUseDOM()) {
    return;
  }

  let dismissedError: AppFeedbackError | undefined;

  updateState((current) => {
    dismissedError = current.errorQueue[0];

    return {
      ...current,
      errorQueue: current.errorQueue.slice(1),
    };
  });

  if (!dismissedError) {
    return;
  }

  const dismissHandler = errorDismissHandlers.get(dismissedError.id);
  errorDismissHandlers.delete(dismissedError.id);
  dismissHandler?.();
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
