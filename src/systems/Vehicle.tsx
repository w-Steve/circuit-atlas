import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group,Mesh } from "three";

import { SimulationClock } from "./VehicleDynamics";
import {carDimensions} from "./VehicleDynamics";
import { bodyPartGeometry } from "./VehicleGeometry";
import {useCircuit} from '../app/CircuitContext';
function Part({
  position,
  size,
  color = "#d4473b",
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  const geometry=useMemo(()=>bodyPartGeometry(size),[size[0],size[1],size[2]]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return (
    <mesh position={position} geometry={geometry}>
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.45} />
    </mesh>
  );
}
export function Vehicle({ active = true }: { active?: boolean }) {
  const {simulation,placeVehicle,vehicle:carObject}=useCircuit();
  const ref = useRef<Group>(null);
  const {gl}=useThree();
  const clock = useRef(new SimulationClock());
  useEffect(() => {
    clock.current.reset();
  }, [active]);
  useEffect(() => {
    const mountedVehicle=ref.current;
    carObject.current = mountedVehicle;
    ref.current?.traverse(object=>{if(object instanceof Mesh){object.castShadow=true;object.receiveShadow=true}});
    const reset = () => clock.current.reset();
    document.addEventListener("visibilitychange", reset);
    window.addEventListener("pageshow", reset);
    return () => {
      if(carObject.current===mountedVehicle)carObject.current = null;
      document.removeEventListener("visibilitychange", reset);
      window.removeEventListener("pageshow", reset);
    };
  }, []);
  useFrame(() => {
    simulation.advance(clock.current.tick(performance.now(), !document.hidden));
    gl.domElement.dataset.simulationSeconds=String(simulation.elapsedSeconds);
    if (ref.current) {
      placeVehicle(ref.current,simulation.distance);
    }
  }, -2);
  // The detailed silhouette is authored in a 5.2 × 1.9 × .95 m reference frame.
  // Apply configurable dimensions once; keep wheelbase and cockpit anchors in metres.
  const scale: [number, number, number] = [
    carDimensions.width / 1.9,
    carDimensions.height / 0.95,
    carDimensions.length / 5.2,
  ];
  const car = {
    width: 1.9,
    length: 5.2,
    wheelbase: carDimensions.wheelbase / scale[2],
    cockpitHeight: carDimensions.cockpitHeight / scale[1],
    cockpitOffset: carDimensions.cockpitOffset / scale[2],
  };
  return (
    <group ref={ref} name="f1-car">
      <group scale={scale}>
        <Part
          position={[0, 0.16, 0]}
          size={[1.5, 0.12, car.length - 0.4]}
          color="#202a30"
        />
        <Part position={[0, 0.4, -0.2]} size={[0.6, 0.4, 2.3]} />
        <Part position={[0, 0.35, 1.55]} size={[0.23, 0.2, 1.7]} />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Part
              position={[side * 0.53, 0.35, -0.4]}
              size={[0.4, 0.35, 1.7]}
            />
            {[-1, 1].map((axle) => (
              <group key={axle}>
                <mesh
                  position={[
                    side * (car.width / 2 - 0.16),
                    0.36,
                    (axle * car.wheelbase) / 2,
                  ]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.36, 0.36, 0.32, 20]} />
                  <meshStandardMaterial color="#141b21" roughness={0.9} />
                </mesh>
                <mesh
                  position={[
                    side * (car.width / 2 - 0.025),
                    0.36,
                    (axle * car.wheelbase) / 2,
                  ]}
                  rotation={[0, Math.PI / 2, 0]}
                >
                  <torusGeometry args={[0.27, 0.018, 5, 24]} />
                  <meshBasicMaterial color="#c9c5b7" />
                </mesh>
              </group>
            ))}
          </group>
        ))}
        <Part
          position={[0, 0.23, car.length / 2 - 0.14]}
          size={[car.width, 0.16, 0.28]}
          color="#dfdcd5"
        />
        <Part
          position={[0, 0.74, -car.length / 2 + 0.15]}
          size={[1.65, 0.22, 0.3]}
          color="#dc4538"
        />
        {[-0.68, 0.68].map((x) => (
          <Part
            key={x}
            position={[x, 0.55, -2.43]}
            size={[0.05, 0.7, 0.33]}
            color="#273238"
          />
        ))}
        <Part
          position={[0, 0.61, -0.45]}
          size={[0.39, 0.16, 0.66]}
          color="#101b23"
        />
        <mesh
          position={[0, car.cockpitHeight, -0.34]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.29, 0.035, 7, 18, Math.PI * 1.8]} />
          <meshStandardMaterial color="#182830" />
        </mesh>
        <mesh position={[0, car.cockpitHeight, car.cockpitOffset]}>
          <sphereGeometry args={[0.14, 12, 8]} />
          <meshStandardMaterial color="#f1ece0" />
        </mesh>
        <Part position={[0, 0.88, -0.9]} size={[0.16, 0.14, 0.3]} />
      </group>
    </group>
  );
}
