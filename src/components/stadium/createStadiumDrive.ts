import * as THREE from "three";
import { createRoadRoute } from "./stadiumRoads";
import { StadiumId } from "../../constants/stadiums";
import { getStadiumLayout } from "./stadiumLayout";

/** A continuous circuit above the venue, including London's pedestrian precinct. */
export function createStadiumDrive(camera: THREE.PerspectiveCamera, stadiumId: StadiumId = "arena") {
  const layout = getStadiumLayout(stadiumId);
  const height = stadiumId === "stamford-bridge" ? 78 : Math.max(30, layout.roofHeight + 16);
  const carRoute = createRoadRoute(-1.7);
  const cameraRoute = createRoadRoute(26);
  const lapDuration = carRoute.getLength() / (stadiumId === "stamford-bridge" ? 5 : 7);
  const point = new THREE.Vector2();
  const car = new THREE.Vector2();
  const focus = new THREE.Vector3();
  return (elapsed: number) => {
    const progress = ((-elapsed / lapDuration) % 1 + 1) % 1;
    cameraRoute.getPointAt((progress + 0.025) % 1, point);
    carRoute.getPointAt(progress, car);
    camera.position.set(point.x, height + Math.sin(progress * Math.PI * 2) * 3, point.y);
    focus.set(car.x * 0.15, stadiumId === "stamford-bridge" ? 8 : layout.roofHeight * 0.55, 18 + (car.y - 18) * 0.15);
    camera.lookAt(focus);
  };
}
