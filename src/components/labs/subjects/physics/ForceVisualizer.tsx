import { useFrame } from '@react-three/fiber';
import { Float, Html, Cylinder, Cone } from '@react-three/drei';

export const ForceVisualizer = () => {
    return (
        <group>
            {/* The Object (Block) */}
            <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[2, 2, 2]} />
                <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.2} />
            </mesh>

            {/* Forces */}
            <VectorForce label="GRAVITY (Fg)" direction={[0, -1, 0]} length={3} color="#ef4444" position={[0, -1, 0]} />
            <VectorForce label="NORMAL (Fn)" direction={[0, 1, 0]} length={3} color="#3b82f6" position={[0, 1, 0]} />
            <VectorForce label="APPLIED (Fa)" direction={[1, 0, 0]} length={4} color="#10b981" position={[1, 0, 0]} />
            <VectorForce label="FRICTION (Ff)" direction={[-1, 0, 0]} length={1.5} color="#f59e0b" position={[-1, 0, 0]} />

            {/* Ground Plane */}
            <mesh position={[0, -1.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[10, 10]} />
                <meshStandardMaterial color="#1e293b" transparent opacity={0.2} />
            </mesh>
        </group>
    );
};

const VectorForce = ({ label, direction, length, color, position }: any) => {
    const isVertical = Math.abs(direction[1]) > 0;
    const rotation: [number, number, number] = isVertical
        ? [0, 0, direction[1] > 0 ? 0 : Math.PI]
        : [0, 0, direction[0] > 0 ? -Math.PI / 2 : Math.PI / 2];

    return (
        <group position={position} rotation={rotation}>
            {/* Shaft */}
            <Cylinder args={[0.05, 0.05, length]} position={[0, length / 2, 0]}>
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </Cylinder>
            {/* Tip */}
            <Cone args={[0.2, 0.4, 16]} position={[0, length, 0]}>
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
            </Cone>
            {/* Label */}
            <Html position={[0, length + 0.3, 0]} center distanceFactor={10}>
                <div className={`px-2 py-0.5 ${color === '#ef4444' ? 'bg-red-600' : color === '#3b82f6' ? 'bg-blue-600' : color === '#10b981' ? 'bg-emerald-600' : 'bg-amber-600'} text-white text-[7px] font-black rounded shadow-lg uppercase whitespace-nowrap`}>
                    {label}
                </div>
            </Html>
        </group>
    );
};
