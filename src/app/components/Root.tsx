import { Outlet } from "react-router";

export default function Root() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
}
