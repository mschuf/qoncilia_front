import type { ReactElement } from "react";
import type { Role } from "../../utils/role";

export interface ProtectedRouteProps {
  children: ReactElement;
  roles?: Role[];
}
