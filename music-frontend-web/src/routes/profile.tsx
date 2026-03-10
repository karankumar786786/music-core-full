import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCoverImageUrl } from "@/lib/s3";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Camera,
  Mail,
  User,
  Check,
  X,
  Loader2,
  LogOut,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import axios from "axios";

export const Route = createFileRoute("/profile")({
  component: ProfileView,
});

function ProfileView() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => musicApi.getProfile(),
  });

  const [formData, setFormData] = useState({ name: user?.name || "" });

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => musicApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => musicApi.changePassword(data),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setIsChangingPassword(false);
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to change password");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { uploadUrl, key } = await musicApi.getProfilePictureUploadUrl(file.name, file.type);
      await axios.put(uploadUrl, file, { headers: { "Content-Type": file.type } });
      return musicApi.updateProfile({ profilePictureKey: key });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile picture updated");
    },
    onError: () => toast.error("Failed to upload profile picture"),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 space-y-8">
        <div className="flex gap-4 items-center">
          <Skeleton className="h-10 w-48 rounded-2xl bg-white/5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-44 w-44 rounded-[32px] bg-white/5" />
            <Skeleton className="h-24 w-full rounded-3xl bg-white/5" />
          </div>
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-56 w-full rounded-[32px] bg-white/5" />
            <Skeleton className="h-36 w-full rounded-[32px] bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  const userInitial = user?.name?.[0]?.toUpperCase() || "?";

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-white">
          Profile Settings
        </h1>
        <p className="text-zinc-500 text-sm mt-1 font-medium">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

        {/* ── Left Column ── */}
        <div className="space-y-4">

          {/* Avatar */}
          <div className="relative mx-auto w-fit">
            <Avatar className="h-44 w-44 rounded-full border border-white/10 shadow-2xl bg-zinc-900 overflow-hidden ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-500">
              <AvatarImage
                src={user?.profilePictureUrl || getCoverImageUrl(user?.profilePictureKey, "large") || ""}
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
              <AvatarFallback className="text-5xl font-black text-primary bg-primary/10">
                {userInitial}
              </AvatarFallback>
            </Avatar>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-3 right-3 h-10 w-10 rounded-xl bg-primary text-black flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer ring-2 ring-black"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
              }}
            />
          </div>

          {/* Quick Stats Card */}
          <div className="glass-effect rounded-3xl p-5 border border-white/5 space-y-5">
            <div>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">
                Account Level
              </p>
              <Badge className="bg-primary/15 text-primary border border-primary/20 font-bold px-3 py-1 text-xs">
                Premium Member
              </Badge>
            </div>
            <div className="h-px bg-white/5" />
            <div>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">
                Member Since
              </p>
              <p className="text-white font-bold text-sm">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : "Recently"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="md:col-span-2 space-y-4">

          {/* Personal Information */}
          <section className="glass-effect rounded-[32px] p-8 border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Personal Information
              </h2>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold border-white/10 hover:bg-white/5 h-8 px-4"
                  onClick={() => {
                    setIsEditing(true);
                    setFormData({ name: user?.name || "" });
                  }}
                >
                  Edit Profile
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Name field */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">
                  Full Name
                </Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="rounded-xl bg-white/5 border-white/10 focus-visible:ring-primary h-11 font-medium text-sm"
                    />
                    <Button
                      size="icon"
                      className="rounded-xl h-11 w-11 bg-primary text-black shrink-0 hover:bg-primary/90"
                      onClick={() => updateProfileMutation.mutate({ name: formData.name })}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-xl h-11 w-11 border-white/10 text-zinc-400 hover:text-white shrink-0"
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5">
                    <User className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span className="text-white font-semibold text-sm">{user?.name}</span>
                  </div>
                )}
              </div>

              {/* Email field */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">
                  Email Address
                </Label>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 opacity-50 cursor-not-allowed select-none">
                  <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="text-white font-medium text-sm">{user?.email}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="glass-effect rounded-[32px] p-8 border border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-zinc-500" />
              <h2 className="text-lg font-bold text-white tracking-tight">Security</h2>
            </div>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed">
              Keep your account secure by updating your password regularly.
            </p>
            <Button
              variant="outline"
              className="w-full rounded-2xl h-12 font-bold border-white/10 hover:bg-white/5 text-white text-sm gap-2 mt-2"
              onClick={() => setIsChangingPassword(true)}
            >
              Update Password
            </Button>
          </section>

          {/* Sign Out */}
          <Button
            variant="ghost"
            className="text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-2xl w-full h-12 font-bold gap-2 text-sm transition-all"
            onClick={() => { musicApi.logout(); window.location.reload(); }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out from One Melody
          </Button>
        </div>
      </div>

      {/* ── Change Password Dialog ── */}
      <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
        <DialogContent className="bg-[#111111] border border-white/15 text-white rounded-[32px] p-8 max-w-md shadow-2xl [&>button]:text-zinc-400 [&>button]:hover:text-white">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-black tracking-tight text-center">
              Change Password
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Old Password */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  type={showOldPassword ? "text" : "password"}
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  className="rounded-xl bg-white/10 border-white/15 h-11 pr-10 text-sm text-white placeholder:text-zinc-600"
                />
                <button
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">
                New Password
              </Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="rounded-xl bg-white/10 border-white/15 h-11 pr-10 text-sm text-white placeholder:text-zinc-600"
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">
                Confirm New Password
              </Label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="rounded-xl bg-white/10 border-white/15 h-11 text-sm text-white placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              className="w-full rounded-2xl h-11 bg-primary text-black font-black text-sm hover:bg-primary/90"
              onClick={() => {
                if (passwordData.newPassword !== passwordData.confirmPassword) {
                  toast.error("Passwords do not match");
                  return;
                }
                changePasswordMutation.mutate({
                  oldPassword: passwordData.oldPassword,
                  newPassword: passwordData.newPassword,
                });
              }}
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Update Password"
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-2xl text-zinc-500 hover:text-white text-sm h-11"
              onClick={() => setIsChangingPassword(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}