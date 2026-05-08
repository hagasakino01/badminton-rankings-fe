"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogIn, UserRound } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import {
  clearSession,
  readSession,
  subscribeSessionChange,
  updateSessionUser,
  type AuthSession,
} from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { User } from "@/types/api";

function getSessionSnapshot() {
  return readSession();
}

type ProfileResponse = {
  token: string;
  user: User;
};

type PasswordResponse = {
  message: string;
};

type StatusState = {
  type: "error" | "success";
  message: string;
};

type ProfileFormState = {
  name: string;
  email: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

const EMPTY_PASSWORD_FORM: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

export function HeaderAccountMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const session = useSyncExternalStore<AuthSession | null>(subscribeSessionChange, getSessionSnapshot, () => null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const [profileForm, setProfileForm] = useState<ProfileFormState>({ name: "", email: "" });
  const [initialProfileForm, setInitialProfileForm] = useState<ProfileFormState>({ name: "", email: "" });
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileStatus, setProfileStatus] = useState<StatusState | null>(null);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(EMPTY_PASSWORD_FORM);
  const [passwordStatus, setPasswordStatus] = useState<StatusState | null>(null);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (!isMenuOpen) {
      return;
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isMenuOpen]);

  const hasProfileChanges =
    profileForm.name.trim() !== initialProfileForm.name.trim() ||
    profileForm.email.trim().toLowerCase() !== initialProfileForm.email.trim().toLowerCase();

  function resetProfileModalState(user: User) {
    const nextState = {
      name: user.name,
      email: user.email,
    };

    setInitialProfileForm(nextState);
    setProfileForm(nextState);
    setIsProfileEditing(false);
    setProfileStatus(null);
  }

  function openProfileModal() {
    if (!session) {
      return;
    }

    resetProfileModalState(session.user);
    setIsMenuOpen(false);
    setIsProfileOpen(true);
  }

  function handleStartProfileEditing() {
    setProfileStatus(null);
    setIsProfileEditing(true);
  }

  function handleCancelProfileEditing() {
    setProfileForm(initialProfileForm);
    setProfileStatus(null);
    setIsProfileEditing(false);
  }

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token || !hasProfileChanges) {
      return;
    }

    setIsProfileSubmitting(true);
    setProfileStatus(null);

    try {
      const response = await apiFetch<ProfileResponse>("/auth/me", {
        method: "PUT",
        token: session.token,
        body: JSON.stringify({
          name: profileForm.name.trim(),
          email: profileForm.email.trim(),
        }),
      });

      updateSessionUser(response.user, response.token);
      setInitialProfileForm({
        name: response.user.name,
        email: response.user.email,
      });
      setProfileForm({
        name: response.user.name,
        email: response.user.email,
      });
      setProfileStatus({
        type: "success",
        message: "Đã cập nhật thông tin tài khoản.",
      });
      setIsProfileEditing(false);
    } catch (error) {
      setProfileStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.",
      });
    } finally {
      setIsProfileSubmitting(false);
    }
  }

  function openPasswordModal() {
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordStatus(null);
    setIsMenuOpen(false);
    setIsPasswordOpen(true);
  }

  async function handlePasswordSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordStatus({
        type: "error",
        message: "Mật khẩu mới nhập lại không khớp.",
      });
      return;
    }

    setIsPasswordSubmitting(true);
    setPasswordStatus(null);

    try {
      await apiFetch<PasswordResponse>("/auth/change-password", {
        method: "POST",
        token: session.token,
        body: JSON.stringify(passwordForm),
      });

      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordStatus({
        type: "success",
        message: "Đã đổi mật khẩu thành công.",
      });
      setIsPasswordOpen(false);
    } catch (error) {
      setPasswordStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Không thể đổi mật khẩu.",
      });
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  function handleCancelPasswordModal() {
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordStatus(null);
    setIsPasswordOpen(false);
  }

  function handleLogout() {
    setIsMenuOpen(false);
    clearSession();
    router.push("/login");
  }

  if (!session) {
    return (
      <nav className="flex items-center gap-2">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "gap-2")}>
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>
        <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}>
          <LogIn className="size-4" />
          Đăng nhập
        </Link>
      </nav>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2" ref={menuRef}>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "gap-2")}>
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>

        <div className="relative">
          <Button
            variant="outline"
            size="lg"
            type="button"
            className="gap-2"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <UserRound className="size-4" />
            <span className="max-w-40 truncate">{session.user.name}</span>
            <ChevronDown className="size-4" />
          </Button>

          {isMenuOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl shadow-black/10">
              <div className="border-b border-border px-3 py-2">
                <p className="truncate font-medium">{session.user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{session.user.email}</p>
              </div>
              <div className="mt-2 grid gap-1">
                <Button variant="ghost" type="button" className="justify-start" onClick={openProfileModal}>
                  Xem hồ sơ
                </Button>
                <Button variant="ghost" type="button" className="justify-start" onClick={openPasswordModal}>
                  Đổi mật khẩu
                </Button>
                <Button variant="ghost" type="button" className="justify-start text-destructive" onClick={handleLogout}>
                  Đăng xuất
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={isProfileOpen}
        onOpenChange={(open) => {
          setIsProfileOpen(open);
          if (!open && session) {
            resetProfileModalState(session.user);
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-3xl p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="font-heading text-2xl">Hồ sơ tài khoản</DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-6">
              Xem thông tin cá nhân. Bấm Chỉnh sửa để mở khóa các trường và cập nhật dữ liệu.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-5 px-6 pb-6" onSubmit={handleProfileSave}>
            {profileStatus && (
              <Alert variant={profileStatus.type === "error" ? "destructive" : "default"}>
                <AlertTitle>
                  {profileStatus.type === "error" ? "Không thể cập nhật" : "Cập nhật thành công"}
                </AlertTitle>
                <AlertDescription>{profileStatus.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="profile-name">Tên hiển thị</Label>
              <Input
                id="profile-name"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                disabled={!isProfileEditing || isProfileSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={profileForm.email}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                disabled={!isProfileEditing || isProfileSubmitting}
                required
              />
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Vai trò hiện tại: <span className="font-medium text-foreground">{session.user.role}</span>
            </div>

            <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl">
              {isProfileEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelProfileEditing}
                    disabled={isProfileSubmitting}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={!hasProfileChanges || isProfileSubmitting}>
                    {isProfileSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setIsProfileOpen(false)}>
                    Đóng
                  </Button>
                  <Button type="button" onClick={handleStartProfileEditing}>
                    Chỉnh sửa
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="font-heading text-2xl">Đổi mật khẩu</DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-6">
              Nhập mật khẩu hiện tại, mật khẩu mới và nhập lại mật khẩu mới để xác nhận thay đổi.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-5 px-6 pb-6" onSubmit={handlePasswordSave}>
            {passwordStatus && (
              <Alert variant={passwordStatus.type === "error" ? "destructive" : "default"}>
                <AlertTitle>
                  {passwordStatus.type === "error" ? "Không thể đổi mật khẩu" : "Đổi mật khẩu thành công"}
                </AlertTitle>
                <AlertDescription>{passwordStatus.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input
                id="new-password"
                type="password"
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Nhập lại mật khẩu mới</Label>
              <Input
                id="confirm-new-password"
                type="password"
                minLength={6}
                value={passwordForm.confirmNewPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmNewPassword: event.target.value,
                  }))
                }
                required
              />
            </div>

            <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelPasswordModal}
                disabled={isPasswordSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isPasswordSubmitting}>
                {isPasswordSubmitting ? "Đang lưu..." : "Đổi mật khẩu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
