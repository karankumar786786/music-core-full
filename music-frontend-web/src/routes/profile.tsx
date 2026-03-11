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
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to change password");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { uploadUrl, key } = await musicApi.getProfilePictureUploadUrl(
        file.name,
        file.type,
      );
      await axios.put(uploadUrl, file, {
        headers: { "Content-Type": file.type },
      });
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
    <div className="max-w-5xl mx-auto pb-10 px-4">
      {/* ── Profile Header ── */}
      <div className="relative mb-12 pt-8">
        {/* Avatar & Basic Info Container */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
          <div className="relative group">
            <Avatar className="h-40 w-40 rounded-3xl  overflow-hidden   ">
              <AvatarImage
                src={
                  user?.profilePictureUrl ||
                  getCoverImageUrl(user?.profilePictureKey, "large") ||
                  ""
                }
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <AvatarFallback className="text-5xl font-black text-primary bg-primary/10">
                {userInitial}
              </AvatarFallback>
            </Avatar>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl bg-primary text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer ring-4 ring-black z-10"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex-1 pb-2 space-y-2 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-4xl font-black tracking-tighter text-white">
                {user?.name}
              </h1>
              <Badge className="bg-primary/20 text-primary border-primary/20 font-bold px-2 py-0 text-[10px] uppercase tracking-widest w-fit">
                Premium
              </Badge>
            </div>
            <p className="text-zinc-500 text-sm font-medium flex items-center justify-center md:justify-start gap-2">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </p>
          </div>

          <div className="pb-2 flex gap-3">
            {!isEditing && (
              <Button
                size="sm"
                className="rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-black hover:bg-white h-11 px-8 transition-all shadow-lg shadow-primary/10"
                onClick={() => {
                  setIsEditing(true);
                  setFormData({ name: user?.name || "" });
                }}
              >
                Edit Profile
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl text-red-500 hover:bg-red-500/10 transition-all border-white/10 bg-zinc-900/50"
              onClick={() => {
                musicApi.logout();
                window.location.reload();
              }}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

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

      {/* ── Modern Tabs-like Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-10 px-4">
        {/* Left Stats Column */}
        <div className="space-y-6">
          <section className="glass-effect rounded-[32px] p-6 border border-white/5 space-y-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none">
              <User className="h-24 w-24 text-white" />
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Account Insights
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400 font-medium">
                    Status
                  </span>
                  <span className="text-sm text-primary font-bold">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400 font-medium">
                    Joined
                  </span>
                  <span className="text-sm text-white font-bold">
                    {user?.createdAt &&
                      new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div className="space-y-3">
              <p className="text-xs text-zinc-500 leading-relaxed italic">
                You have been a member of One Melody since{" "}
                {user?.createdAt && new Date(user.createdAt).getFullYear()}.
                Thank you for being part of our community!
              </p>
            </div>
          </section>
        </div>

        {/* Right Content Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Settings Section */}
          <section className="glass-effect rounded-[32px] p-8 border border-white/5 space-y-8 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                Account Details
              </h2>
            </div>

            <div className="space-y-6">
              {/* Name field */}
              <div className="space-y-2">
                <Label className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                  Display Name
                </Label>
                {isEditing ? (
                  <div className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="rounded-xl bg-white/5 text-white border-white/10 focus-visible:ring-primary h-12 font-medium"
                    />
                    <Button
                      size="icon"
                      className="rounded-xl h-12 w-12 bg-primary text-black shrink-0 hover:bg-primary/90"
                      onClick={() =>
                        updateProfileMutation.mutate({ name: formData.name })
                      }
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
                      className="rounded-xl h-12 w-12 border-white/10 text-zinc-400 hover:text-white shrink-0"
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-white/10 transition-colors">
                    <User className="w-5 h-5 text-zinc-600" />
                    <span className="text-white font-bold text-base">
                      {user?.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Email field */}
              <div className="space-y-2">
                <Label className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                  Email Address
                </Label>
                <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 border border-white/5 opacity-50 cursor-not-allowed">
                  <Mail className="w-5 h-5 text-zinc-600" />
                  <span className="text-white font-medium text-base">
                    {user?.email}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Security Card */}
          <section className="glass-effect rounded-[40px] p-8 border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Security & Privacy
                  </h2>
                </div>
                <p className="text-zinc-500 text-sm font-medium max-w-sm leading-relaxed">
                  Manage your authentication methods and keep your account safe
                  by rotating passwords routinely.
                </p>
              </div>

              <Button
                variant="outline"
                className="rounded-2xl h-12 px-6 font-bold border-white/10 hover:bg-primary hover:text-black hover:border-primary transition-all duration-300"
                onClick={() => setIsChangingPassword(true)}
              >
                Change Password
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* ── Change Password Dialog ── */}
      <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
        <DialogContent className="bg-black border border-white/10 text-white rounded-[40px] p-10 max-w-md shadow-2xl glass-effect">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black tracking-tight text-center">
              Safety Check
            </DialogTitle>
            <p className="text-center text-zinc-500 text-sm font-medium">
              Verify your identity to update password
            </p>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  type={showOldPassword ? "text" : "password"}
                  value={passwordData.oldPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      oldPassword: e.target.value,
                    })
                  }
                  className="rounded-xl bg-white/5 border-white/10 h-12 pr-12"
                />
                <button
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showOldPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">
                New Secret Password
              </Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  className="rounded-xl bg-white/5 border-white/10 h-12 pr-12"
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">
                Confirm New Secret
              </Label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                className="rounded-xl bg-white/5 border-white/10 h-12"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6">
            <Button
              className="w-full rounded-2xl h-14 bg-primary text-black font-black hover:bg-white transition-all shadow-xl shadow-primary/20"
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
                <Loader2 className="animate-spin" />
              ) : (
                "Update Credentials"
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-2xl text-zinc-500 hover:text-white h-11 transition-colors"
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
