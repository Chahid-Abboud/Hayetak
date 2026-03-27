import { createBrowserRouter } from "react-router";
import { LandingPage } from "./components/landing/LandingPage";
import { LoginPage } from "./components/auth/LoginPage";
import { RegisterPage } from "./components/auth/RegisterPage";
import { ForgotPasswordPage } from "./components/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./components/auth/ResetPasswordPage";
import { ConfirmPasswordPage } from "./components/auth/ConfirmPasswordPage";
import { VerifyEmailPage } from "./components/auth/VerifyEmailPage";
import { TwoFactorPage } from "./components/auth/TwoFactorPage";
import { AppLayout, ComingSoonPage } from "./components/layout/AppLayout";
import { DashboardPage } from "./components/dashboard/DashboardPage";
import { CoachPage } from "./components/coach/CoachPage";
import { MealsPage } from "./components/meals/MealsPage";
import { WorkoutsPage } from "./components/workouts/WorkoutsPage";
import { WorkoutLogPage } from "./components/workouts/WorkoutLogPage";
import { NearbyPage } from "./components/nearby/NearbyPage";

const MessagesPlaceholder = () => ComingSoonPage({ title: "Messages" });
const AppointmentsPlaceholder = () => ComingSoonPage({ title: "Appointments" });

export const router = createBrowserRouter([
  { path: "/", Component: LandingPage },
  { path: "/login", Component: LoginPage },
  { path: "/register", Component: RegisterPage },
  { path: "/forgot-password", Component: ForgotPasswordPage },
  { path: "/reset-password/:token", Component: ResetPasswordPage },
  { path: "/confirm-password", Component: ConfirmPasswordPage },
  { path: "/verify-email/:token", Component: VerifyEmailPage },
  { path: "/2fa-challenge", Component: TwoFactorPage },
  {
    path: "/app",
    Component: AppLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "dashboard", Component: DashboardPage },
      { path: "coach", Component: CoachPage },
      { path: "meals", Component: MealsPage },
      { path: "workouts", Component: WorkoutsPage },
      { path: "workouts/log/:id", Component: WorkoutLogPage },
      { path: "nearby", Component: NearbyPage },
      { path: "messages", Component: MessagesPlaceholder },
      { path: "appointments", Component: AppointmentsPlaceholder },
    ],
  },
]);