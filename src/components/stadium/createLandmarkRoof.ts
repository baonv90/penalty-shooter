import { StadiumId } from "../../constants/stadiums";
import { createSanSiroRoof } from "./createSanSiroRoof";
import { createStamfordBridgeRoof } from "./createStamfordBridge";

/** The full-size venues and selection models share the same roof architecture. */
export function createLandmarkRoof(id: StadiumId) {
  return id === "san-siro" ? createSanSiroRoof() : createStamfordBridgeRoof();
}
