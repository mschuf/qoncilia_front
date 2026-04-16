import type { ReactElement } from "react";
import type { Role } from "../../utils/role";
import type { AppModuleCode } from "../../utils/modules";

export interface ProtectedRouteProps {
  children: ReactElement;
  roles?: Role[];
  requiredModule?: AppModuleCode;
}
