import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import ProfileTab from "@/components/ProfileTab";

const ScoutProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?role=scout");
  }, [user, authLoading]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
          <div className="mb-5">
            <h1 className="font-display text-3xl text-foreground">PROFILE</h1>
            <p className="text-sm text-muted-foreground">Manage your scout profile</p>
          </div>
          <ProfileTab />
        </motion.div>
      </div>
    </div>
  );
};

export default ScoutProfile;
