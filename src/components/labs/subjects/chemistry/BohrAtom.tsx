import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html, Trail } from '@react-three/drei';
import * as THREE from 'three';

export const BohrAtom = () => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.005;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Nucleus: Protons (Red) and Neutrons (Grey) */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <group>
                    {/* First Proton/Neutron pair for visual density */}
                    <mesh position={[0.2, 0.1, 0]}>
                        <sphereGeometry args={[0.45, 32, 32]} />
                        <meshStandardMaterial color="#ef4444" roughness={0.1} metalness={0.8} />
                        <Html position={[0.5, 0, 0]} center distanceFactor={10}>
                            <div className="px-2 py-0.5 bg-red-600 text-[8px] font-black text-white rounded uppercase shadow-lg select-none">Proton</div>
                        </Html>
                    </mesh>

                    <mesh position={[-0.2, -0.1, 0.1]}>
                        <sphereGeometry args={[0.45, 32, 32]} />
                        <meshStandardMaterial color="#94a3b8" roughness={0.3} />
                        <Html position={[-0.5, 0, 0]} center distanceFactor={10}>
                            <div className="px-2 py-0.5 bg-slate-500 text-[8px] font-black text-white rounded uppercase shadow-lg select-none">Neutron</div>
                        </Html>
                    </mesh>

                    {/* Central Hull Title */}
                    <Html position={[0, 1.2, 0]} center distanceFactor={10}>
                        <div className="px-3 py-1 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg shadow-xl select-none">
                            <span className="text-[10px] font-black text-slate-900 tracking-tighter uppercase">NUCLEUS (CORE)</span>
                        </div>
                    </Html>
                </group>
            </Float>

            {/* Electron Shells */}
            {[2, 4, 6].map((radius, i) => (
                <group key={i}>
                    {/* Orbit Path */}
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[radius, 0.015, 16, 100]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
                    </mesh>

                    {/* Floating Electron */}
                    <Electron
                        radius={radius}
                        speed={1 + i * 0.4}
                        color={i === 0 ? "#38bdf8" : "#818cf8"}
                        offset={i * Math.PI * 0.5}
                    />
                </group>
            ))}
        </group>
    );
};

const Electron = ({ radius, speed, color, offset }: { radius: number, speed: number, color: string, offset: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            const angle = state.clock.elapsedTime * speed + offset;
            meshRef.current.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        }
    });

    return (
        <group>
            <Trail width={1} length={4} color={color} attenuation={(t) => t * t}>
                <mesh ref={meshRef}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} />
                </mesh>
            </Trail>

            {/* Electron label that follows the mesh position */}
            <mesh ref={meshRef as any}>
                <Html distanceFactor={10} position={[0, 0.3, 0]} center>
                    <div className="px-2 py-0.5 bg-indigo-600/90 text-[7px] font-black text-white rounded-full uppercase shadow-lg select-none">e⁻</div>
                </Html>
            </mesh>
        </group>
    );
};
