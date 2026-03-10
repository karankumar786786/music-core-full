import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { musicApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isClosable?: boolean;
  onSuccess?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  isClosable = true,
  onSuccess,
}: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const queryClient = useQueryClient();

  const authMutation = useMutation({
    mutationFn: (data: any) => {
      // Clean data based on isLogin
      const payload = isLogin
        ? { email: data.email, password: data.password }
        : data;
      return isLogin ? musicApi.login(payload) : musicApi.register(payload);
    },
    onSuccess: (data) => {
      if (data.user) {
        queryClient.setQueryData(["me"], data.user);
      }
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success(
        isLogin ? "Logged in successfully" : "Registered successfully",
      );
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      console.error("Auth Error:", error.response?.data);
      const message = error.response?.data?.message;
      if (Array.isArray(message)) {
        toast.error(message[0]);
      } else {
        toast.error(message || "Authentication failed");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    authMutation.mutate(formData);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isClosable) return;
        onClose();
      }}
    >
      <DialogContent className="sm:max-w-[420px] bg-zinc-950 border-white/10 p-8 rounded-[32px] overflow-hidden [&>button]:hidden">
        {/* {isClosable && (
          <button
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            onClick={onClose}
          >
          </button>
        )} */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 opacity-20 pointer-events-none">
          <div className="h-64 w-64 rounded-full bg-primary blur-3xl" />
        </div>

        <DialogHeader className="relative z-10 mb-6">
          <DialogTitle className="text-3xl font-black tracking-tighter text-white">
            {isLogin ? "Welcome Back" : "Join One Melody"}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 font-medium">
            {isLogin
              ? "Sign in to your account to continue"
              : "Create an account to start your musical journey"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
                Name
              </label>
              <Input
                placeholder="Your Name"
                className="bg-zinc-900/50 text-white border-white/5 h-12 rounded-2xl focus:ring-primary focus:border-primary"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required={!isLogin}
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
              Email
            </label>
            <Input
              type="email"
              placeholder="name@example.com"
              className="bg-zinc-900/50 text-white border-white/5 h-12 rounded-2xl focus:ring-primary focus:border-primary"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              className="bg-zinc-900/50 text-white border-white/5 h-12 rounded-2xl focus:ring-primary focus:border-primary"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-lg mt-4 shadow-lg shadow-primary/20"
            disabled={authMutation.isPending}
          >
            {authMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="mr-2 h-5 w-5" /> Sign In
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-5 w-5" /> Sign Up
              </>
            )}
          </Button>

          <div className="text-center mt-6">
            <p className="text-sm text-zinc-500">
              {isLogin ? "New to One Melody?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-bold hover:underline"
              >
                {isLogin ? "Create an account" : "Sign In"}
              </button>
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
