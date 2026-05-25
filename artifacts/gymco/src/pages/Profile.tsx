import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Target, Activity, Edit2, Check } from "lucide-react";

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const updateMe = useUpdateMe();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    fitnessGoal: "",
    weeklyGoal: 0
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        city: user.city,
        fitnessGoal: user.fitnessGoal,
        weeklyGoal: user.weeklyGoal
      });
    }
  }, [user]);

  const handleSave = () => {
    updateMe.mutate(
      { data: { ...formData, weeklyGoal: Number(formData.weeklyGoal) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setIsEditing(false);
          toast.success("Profile updated");
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">Profile</h1>
        <Button 
          variant={isEditing ? "default" : "outline"} 
          size="sm" 
          className="font-bold"
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={updateMe.isPending}
        >
          {isEditing ? <><Check className="h-4 w-4 mr-2" /> Save</> : <><Edit2 className="h-4 w-4 mr-2" /> Edit</>}
        </Button>
      </div>

      {/* Header Card */}
      <Card className="bg-card border-none shadow-lg overflow-hidden">
        <div className="h-24 bg-primary/20" />
        <CardContent className="p-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12 mb-6">
            <div className="h-24 w-24 rounded-full border-4 border-card bg-secondary overflow-hidden shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-full w-full p-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 w-full">
              {isEditing ? (
                <div className="space-y-4 w-full">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label>City</Label>
                      <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-black">{user.name}</h2>
                  <p className="text-muted-foreground font-medium">{user.email} • {user.city}</p>
                </div>
              )}
            </div>
          </div>
          
          {!isEditing && (
            <div className="grid grid-cols-3 gap-4 border-t border-border pt-6 mt-6">
              <div className="text-center">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Joined</div>
                <div className="font-bold">{new Date(user.joinedAt).getFullYear()}</div>
              </div>
              <div className="text-center border-l border-border">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Streak</div>
                <div className="font-bold text-orange-500">{user.streakDays} <span className="text-xs text-muted-foreground">days</span></div>
              </div>
              <div className="text-center border-l border-border">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Score</div>
                <div className="font-bold text-primary">{user.fitnessScore}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-none shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-bold flex items-center mb-6 text-lg"><Target className="h-5 w-5 mr-2 text-primary" /> Goals & Activity</h3>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Primary Fitness Goal</Label>
                  <Input value={formData.fitnessGoal} onChange={e => setFormData({...formData, fitnessGoal: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Weekly Workout Goal</Label>
                  <Input type="number" value={formData.weeklyGoal} onChange={e => setFormData({...formData, weeklyGoal: Number(e.target.value)})} />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Primary Goal</div>
                  <div className="font-bold text-lg capitalize">{user.fitnessGoal}</div>
                </div>
                <Separator />
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Weekly Progress</div>
                    <div className="font-bold">{user.weeklyWorkouts} / {user.weeklyGoal}</div>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ width: `${Math.min((user.weeklyWorkouts / user.weeklyGoal) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-none shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-bold flex items-center mb-6 text-lg"><Activity className="h-5 w-5 mr-2 text-primary" /> Body Metrics</h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Height</div>
                <div className="font-black text-xl">{user.heightCm} <span className="text-sm font-bold text-muted-foreground">cm</span></div>
              </div>
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Weight</div>
                <div className="font-black text-xl">{user.weightKg} <span className="text-sm font-bold text-muted-foreground">kg</span></div>
              </div>
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Age</div>
                <div className="font-black text-xl">{user.age}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">BMI</div>
                <div className="font-black text-xl text-blue-400">{user.bmi}</div>
              </div>
            </div>
            {!isEditing && (
              <div className="mt-6 text-xs text-muted-foreground font-medium text-center">
                Body metrics sync automatically from connected health devices.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
