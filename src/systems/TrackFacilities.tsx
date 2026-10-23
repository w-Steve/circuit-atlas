import { useMemo, useLayoutEffect, useRef } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
} from "three";
import { Html, Line } from "@react-three/drei";
import { facilities as f, local, along } from "../data/config";
import { at, length, tangent } from "./CircuitGeometry";
import { standGeometry, tierData } from "./GrandstandGeometry";
import { useApp } from "../store";
const rotation = Math.atan2(-along.z, along.x);
export function Block({
  x = 0,
  z = 0,
  y = 0,
  size,
  color = "#b5c0c3",
}: {
  x?: number;
  z?: number;
  y?: number;
  size: [number, number, number];
  color?: string;
}) {
  return (
    <mesh castShadow receiveShadow position={local(x, y, z)} rotation={[0, rotation, 0]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}
export function Grandstand() {
  const select = useApp((s) => s.select);
  const setMode = useApp((s) => s.setMode);
  const mode = useApp((s) => s.mode);
  const geoms = useMemo(
    () => ({ lower: standGeometry("lower"), upper: standGeometry("upper") }),
    [],
  );
  return (
    <>
      {(["lower", "upper"] as const).map((tier) => {
        const t = tierData(tier);
        return (
          <group key={tier}>
            <mesh
              geometry={geoms[tier]}
              userData={{selectionTier:tier}}
              onClick={(e) => {
                if (mode === "eye" || mode === "phone" || e.delta > 4) return;
                e.stopPropagation();
                const p = e.point;
                const center = local(0, 0, 0);
                const dx = p.x - center[0],
                  dz = p.z - center[2];
                const lateral = dx * along.x + dz * along.z;
                const offset = dx * along.z - dz * along.x;
                useApp.getState().chooseZone('a');
                select({
                  tier,
                  u: lateral / f.stand.length + 0.5,
                  v: (offset - t.offset) / t.depth,
                });
                setMode("select");
              }}
            >
              <meshStandardMaterial
                color={tier === "lower" ? "#858e8a" : "#a7adaa"}
                side={2}
              />
            </mesh>
            {Array.from({ length: 15 }, (_, i) => (
              <Line
                key={i}
                points={[
                  local(
                    -f.stand.length / 2,
                    t.base + (i / 14) * t.rise + 0.05,
                    t.offset + (i / 14) * t.depth,
                  ),
                  local(
                    f.stand.length / 2,
                    t.base + (i / 14) * t.rise + 0.05,
                    t.offset + (i / 14) * t.depth,
                  ),
                ]}
                color="#d4d7d0"
                lineWidth={0.6}
              />
            ))}
          </group>
        );
      })}
      <Block
        z={f.stand.roofOffset}
        y={f.stand.roofHeight}
        size={[390, 1.2, f.stand.roofDepth]}
        color="#b5c4c8"
      />
      <Block z={82} y={16} size={[380, 32, 2]} color="#65767d" />
      {Array.from({ length: 10 }, (_, i) => (
        <Block key={i} x={-180 + i * 40} z={79} y={16} size={[1.1, 32, 1.1]} />
      ))}

    </>
  );
}
export function TrackFacilities() {
  return (
    <>
      <Block z={-22} y={0.15} size={[480, 0.2, 13]} color="#5b686c" />
      <Block z={-12} y={0.65} size={[450, 1.3, 0.6]} />
      <Block
        z={f.pit.offset}
        y={f.pit.height / 2}
        size={[f.pit.length, f.pit.height, f.pit.width]}
        color="#c2cbc9"
      />
      <Block z={-40} y={16} size={[355, 2, 30]} color="#53636b" />
      {Array.from({ length: 33 }, (_, i) => (
        <group key={i}>
          <Block
            x={-160 + i * 10}
            z={-29.9}
            y={3}
            size={[8, 5.5, 0.18]}
            color="#293941"
          />
          <Block
            x={-160 + i * 10}
            z={-29.7}
            y={6.4}
            size={[8, 0.5, 0.2]}
            color={i % 3 === 0 ? "#c74b40" : "#95a5a6"}
          />
        </group>
      ))}
      {Array.from({ length: 22 }, (_, i) => (
        <Block
          key={i}
          x={-150 + i * 8}
          z={i % 2 === 0 ? -3.5 : 3.5}
          y={0.24}
          size={[3.5, 0.02, 0.15]}
          color="#eeeeeb"
        />
      ))}
      {[f.start.distance, f.finish.distance].map((s, i) => (
        <mesh
          key={s}
          position={at(s).setY(0.25)}
          rotation={[0, Math.atan2(tangent(s).x, tangent(s).z), 0]}
        >
          <boxGeometry args={[f.roadWidth, 0.02, i === 0 ? 0.35 : 0.65]} />
          <meshBasicMaterial color={i === 0 ? "#eeeeec" : "#edcf77"} />
        </mesh>
      ))}
      <Fence />
      <Tyres />
    </>
  );
}
function Fence() {
  const mesh = useRef<InstancedMesh>(null);
  const wires = useMemo(() => {
    const a: number[] = [];
    for (let i = 0; i < 12; i++)
      a.push(
        ...local(-240, 0.2 + i * 0.3, f.fence.offset),
        ...local(240, 0.2 + i * 0.3, f.fence.offset),
      );
    // Diamond mesh at fixed world coordinates; contrast comes from material,
    // never moving the fence out of the observer's sightline.
    for(let x=-240;x<240;x+=.6)for(let y=0;y+.3<=f.fence.height;y+=.3){
      a.push(...local(x,y,f.fence.offset),...local(Math.min(240,x+.6),y+.3,f.fence.offset));
      a.push(...local(x,y+.3,f.fence.offset),...local(Math.min(240,x+.6),y,f.fence.offset));
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(a, 3));
    return g;
  }, []);
  useLayoutEffect(() => {
    const m = new Matrix4();
    for (let i = 0; i < 49; i++) {
      m.makeTranslation(
        ...local(-240 + i * 10, f.fence.height / 2, f.fence.offset),
      );
      mesh.current!.setMatrixAt(i, m);
    }
    mesh.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, 49]}>
        <boxGeometry args={[0.12, f.fence.height, 0.12]} />
        <meshStandardMaterial color="#26342f" />
      </instancedMesh>
      <lineSegments geometry={wires}>
        <lineBasicMaterial
          color="#263b32"
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
}
function Tyres() {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new Matrix4();
    for (let i = 0; i < f.tyres.count * f.tyres.layers; i++) {
      m.makeTranslation(
        ...local(
          f.tyres.start + Math.floor(i / f.tyres.layers) * f.tyres.spacing,
          0.3 + (i % f.tyres.layers) * f.tyres.layerStep,
          f.tyres.offset,
        ),
      );
      ref.current!.setMatrixAt(i, m);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, f.tyres.count * f.tyres.layers]}
    >
      <cylinderGeometry
        args={[f.tyres.radius, f.tyres.radius, f.tyres.thickness, 12]}
      />
      <meshStandardMaterial color="#20282b" roughness={0.95} />
    </instancedMesh>
  );
}
export function Markers() {
  const mode = useApp((s) => s.mode),
    setMode = useApp((s) => s.setMode);
  if (mode !== "overview") return null;
  return (
    <>
      <Html
        portal={{ current: document.getElementById("scene-labels")! }}
        position={local(0, 40, 80)}
        center
      >
        <div>
          <button className="marker" data-zone="a" onClick={() => {useApp.getState().chooseZone('a');setMode("select")}}>
            A 主看台 ↗
          </button>
        </div>
      </Html>
      <Html
        portal={{ current: document.getElementById("scene-labels")! }}
        position={local(0, 23, -65)}
        center
      >
        <div className="marker">P 房 / PIT</div>
      </Html>
      <Html
        portal={{ current: document.getElementById("scene-labels")! }}
        position={at(f.start.distance).setY(5)}
        center
      >
        <div className="marker subtle">发车线</div>
      </Html>
      <Html
        portal={{ current: document.getElementById("scene-labels")! }}
        position={at(f.finish.distance).setY(5)}
        center
      >
        <div className="marker subtle">计时线</div>
      </Html>
    </>
  );
}
