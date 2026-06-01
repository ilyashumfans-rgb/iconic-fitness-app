import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <img
        src={`${import.meta.env.BASE_URL}media/iconic-fitness-icon-transparent.png`}
        alt="Iconic Fitness"
        className="h-20 w-auto"
      />
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/`}
      />
    </div>
  );
}
