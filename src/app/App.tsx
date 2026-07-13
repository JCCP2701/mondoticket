import { RouterProvider } from "react-router";
import { router } from "./routes.tsx";
import { AuthProvider } from "./context/AuthContext";
import { StripeProvider } from "./context/StripeContext";

export default function App() {
  return (
    <AuthProvider>
      <StripeProvider>
        <RouterProvider router={router} />
      </StripeProvider>
    </AuthProvider>
  );
}
