import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, Show } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
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
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";

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

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey && typeof console !== "undefined") {
  // Member auth is disabled without a Clerk key. Admin portal still works.
  console.warn(
    "[GYMCO] VITE_CLERK_PUBLISHABLE_KEY missing — member sign-in disabled.",
  );
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#FF6B1A",
    colorForeground: "hsl(222 47% 11%)",
    colorMutedForeground: "hsl(215 16% 47%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "hsl(222 47% 11%)",
    colorNeutral: "hsl(214 32% 91%)",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-white border border-slate-200 shadow-2xl rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 text-2xl font-bold",
    headerSubtitle: "text-slate-500",
    socialButtonsBlockButtonText: "text-slate-700 font-medium",
    formFieldLabel: "text-slate-700 font-medium",
    footerActionLink: "text-orange-600 hover:text-orange-700 font-semibold",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-orange-600",
    formFieldSuccessText: "text-emerald-600",
    alertText: "text-slate-700",
    logoBox: "h-12 mb-2",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton:
      "border border-slate-200 hover:bg-slate-50 transition",
    formButtonPrimary:
      "!bg-gradient-to-r !from-orange-500 !to-purple-600 hover:!opacity-95 text-white font-semibold",
    formFieldInput:
      "border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-orange-500/40",
    footerAction: "text-sm",
    dividerLine: "bg-slate-200",
    alert: "bg-red-50 border border-red-200",
    otpCodeFieldInput: "border border-slate-200",
    formFieldRow: "",
    main: "",
  },
};

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

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Dashboard />
        </Layout>
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function MemberShellRoutes() {
  const [location] = useLocation();
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

function AppShell() {
  const [location] = useLocation();

  if (location === "/") {
    return <HomeRoute />;
  }

  if (location.startsWith("/sign-in") || location.startsWith("/sign-up")) {
    return (
      <Switch>
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
      </Switch>
    );
  }

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

  return <MemberShellRoutes />;
}

function ClerkRouterBridge({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  // Admin portal is fully isolated from Clerk so admin auth never depends on member-auth env.
  if (location.startsWith("/admin") || !clerkPubKey) {
    return <>{children}</>;
  }
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/dashboard`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <ClerkRouterBridge>
              <AppShell />
            </ClerkRouterBridge>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
