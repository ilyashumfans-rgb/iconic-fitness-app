import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
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

const queryClient = new QueryClient();

function AppShell() {
  const [location] = useLocation();

  // Landing page is fully standalone (no sidebar)
  if (location === "/") {
    return <Landing />;
  }

  return (
    <Layout>
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
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppShell />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
