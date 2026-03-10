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

  const [formData, setFormData] = useState({
    name: user?.name || "",
  });

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
      <div className="flex flex-col items-center py-20">
        <Skeleton className="h-32 w-32 rounded-full mb-6" />
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  const userInitial = user?.name?.[0]?.toUpperCase() || "?";

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          Profile Settings
        </h1>
        <p className="text-zinc-500">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Left Column: Avatar & Quick Stats */}
        <div className="space-y-8">
          <div className="relative group mx-auto w-fit">
            <Avatar className="h-48 w-48 rounded-[40px] border-4 border-white/5 shadow-2xl bg-zinc-900 overflow-hidden ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all duration-500">
              <AvatarImage
                src={
                  user?.profilePictureUrl ||
                  getCoverImageUrl(user?.profilePictureKey, "large") ||
                  ""
                }
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <AvatarFallback className="text-5xl font-black text-primary bg-primary/10">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-4 right-4 h-12 w-12 rounded-2xl bg-primary text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer ring-4 ring-black"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Camera className="w-6 h-6" />
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

          <div className="glass-effect rounded-3xl p-6 border border-white/5 space-y-6">
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                Account Level
              </p>
              <Badge className="bg-primary/20 text-primary border-primary/30 font-bold px-3 py-1">
                Premium Member
              </Badge>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                Member Since
              </p>
              <p className="text-white font-bold">
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

        {/* Right Column: Profile Info & Actions */}
        <div className="md:col-span-2 space-y-10">
          <section className="glass-effect rounded-[40px] p-10 border border-white/10 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Personal Information
              </h2>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold border-white/10 hover:bg-white/5"
                  onClick={() => {
                    setIsEditing(true);
                    setFormData({ name: user?.name || "" });
                  }}
                >
                  Edit Profile
                </Button>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-zinc-500 font-bold ml-1">
                  Full Name
                </Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="rounded-xl bg-white/5 border-white/10 focus:ring-primary h-12 font-medium"
                    />
                    <Button
                      size="icon"
                      className="rounded-xl h-12 w-12 bg-primary text-black flex-shrink-0"
                      onClick={() =>
                        updateProfileMutation.mutate({ name: formData.name })
                      }
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-xl h-12 w-12 border-white/10 text-white flex-shrink-0"
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <User className="w-5 h-5 text-zinc-500" />
                    <span className="text-white font-bold">{user?.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-500 font-bold ml-1">
                  Email Address
                </Label>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 opacity-60 cursor-not-allowed">
                  <Mail className="w-5 h-5 text-zinc-500" />
                  <span className="text-white font-medium">{user?.email}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-effect rounded-[40px] p-10 border border-white/10 space-y-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Security
            </h2>
            <p className="text-zinc-500 text-sm font-medium">
              Maintain your account security by updating your password
              regularly.
            </p>
            <Button
              variant="outline"
              className="w-full rounded-2xl h-14 font-bold border-white/10 hover:bg-white/5 text-white gap-3"
              onClick={() => setIsChangingPassword(true)}
            >
              Update Password
            </Button>
          </section>

          <section className="pt-6">
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-2xl w-full h-14 font-black gap-3 transition-all"
              onClick={() => {
                musicApi.logout();
                window.location.reload();
              }}
            >
              <LogOut className="w-5 h-5" /> Sign Out from One Melody
            </Button>
          </section>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
        <DialogContent className="glass-effect  border-white/10 text-white rounded-[40px] p-8 max-w-md bg-black/60 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black  tracking-tight text-center">
              Change Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold">
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
                  className="rounded-2xl bg-white/5 border-white/10 h-12"
                />
                <button
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
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
              <Label className="text-zinc-500 font-bold">New Password</Label>
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
                  className="rounded-2xl bg-white/5 border-white/10 h-12"
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
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
              <Label className="text-zinc-500 font-bold">
                Confirm New Password
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
                className="rounded-2xl bg-white/5 border-white/10 h-12"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              className="w-full rounded-2xl h-12 bg-primary text-black font-black"
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
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Update Password"
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-2xl text-zinc-500 hover:text-white"
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
