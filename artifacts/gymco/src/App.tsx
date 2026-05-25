import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { PublicLayout } from "@/components/PublicLayout";
import { ThemeProvider } from "@/lib/theme";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Explore from "@/pages/Explore";
import GymDetail from "@/pages/GymDetail";
import Classes from "@/pages/Classes";
import ClassDetail from "@/pages/ClassDetail";
import Bookings from "@/pages/Bookings";
import Memberships from "@/pages/Memberships";
import Checkin from "@/pages/Checkin";
import Trainers from "@/pages/Trainers";
import TrainerDetail from "@/pages/TrainerDetail";
import Wallet from "@/pages/Wallet";
import Profile from "@/pages/Profile";

import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminPartners from "@/pages/admin/Partners";
import AdminPartnerOnboarding from "@/pages/admin/PartnerOnboarding";
import AdminResetPartnerPassword from "@/pages/admin/ResetPartnerPassword";
import AdminGymManagement from "@/pages/admin/GymManagement";
import AdminFeaturedGyms from "@/pages/admin/FeaturedGyms";
import AdminGymVerification from "@/pages/admin/GymVerification";
import AdminUsers from "@/pages/admin/Users";
import AdminUserManagement from "@/pages/admin/UserManagement";
import AdminMemberships from "@/pages/admin/Memberships";
import AdminMembershipManagement from "@/pages/admin/MembershipManagement";

const queryClient = new QueryClient();

// Public browsable routes use a top-nav shell (no member sidebar / profile)
const PUBLIC_ROUTES = [
  "/explore",
  "/gyms/",
  "/classes",
  "/trainers",
  "/memberships",
];

function isPublicPath(path: string) {
  return PUBLIC_ROUTES.some(
    (p) => path === p || path === p.replace(/\/$/, "") || path.startsWith(p),
  );
}

function AppShell() {
  const [location] = useLocation();

  // Landing page is fully standalone (no shell)
  if (location === "/") {
    return <Landing />;
  }

  // Admin portal is fully standalone (its own dark layout)
  if (location.startsWith("/admin")) {
    return (
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/partners" component={AdminPartners} />
        <Route path="/admin/partner-onboarding" component={AdminPartnerOnboarding} />
        <Route path="/admin/reset-partner-password" component={AdminResetPartnerPassword} />
        <Route path="/admin/gyms" component={AdminGymManagement} />
        <Route path="/admin/featured-gyms" component={AdminFeaturedGyms} />
        <Route path="/admin/gym-verification" component={AdminGymVerification} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/user-management" component={AdminUserManagement} />
        <Route path="/admin/memberships" component={AdminMemberships} />
        <Route path="/admin/membership-management" component={AdminMembershipManagement} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  const Shell = isPublicPath(location) ? PublicLayout : Layout;

  return (
    <Shell>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/explore" component={Explore} />
        <Route path="/gyms/:gymId" component={GymDetail} />
        <Route path="/classes" component={Classes} />
        <Route path="/classes/:classId" component={ClassDetail} />
        <Route path="/bookings" component={Bookings} />
        <Route path="/memberships" component={Memberships} />
        <Route path="/checkin" component={Checkin} />
        <Route path="/trainers" component={Trainers} />
        <Route path="/trainers/:trainerId" component={TrainerDetail} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppShell />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
