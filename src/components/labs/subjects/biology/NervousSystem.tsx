import React from 'react';
import { Float, Html, MeshDistortMaterial } from '@react-three/drei';

export const NervousSystem = () => {
    return (
        <group>
            {/* Brain */}
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                <mesh position={[0, 1.5, 0]}>
                    <sphereGeometry args={[0.8, 64, 64]} />
                    <MeshDistortMaterial
                        color="#f472b6"
                        speed={2}
                        distort={0.4}
                        radius={1}
                        emissive="#f472b6"
                        emissiveIntensity={0.2}
                    />
                    <NerveLabel text="CEREBRUM" position={[1, 0.5, 0]} />
                    <NerveLabel text="BRAIN" position={[0, 1.2, 0]} color="bg-pink-500 text-white" />
                </mesh>
            </Float>

            {/* Spinal Cord */}
            <mesh position={[0, -1, 0]}>
                <capsuleGeometry args={[0.08, 4, 8, 16]} />
                <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={0.5} />
                <NerveLabel text="SPINAL CORD" position={[0.5, 0.5, 0]} />
            </mesh>

            {/* Nerve Branches (Peripheral Nervous System) */}
            {[1, 0, -1, -2].map((y, i) => (
                <group key={i} position={[0, y, 0]}>
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.02, 0.02, 3]} />
                        <meshStandardMaterial color="#f472b6" transparent opacity={0.6} />
                    </mesh>
                    {i === 1 && <NerveLabel text="PERIPHERAL NERVES" position={[-1.8, 0, 0]} />}
                </group>
            ))}
        </group>
    );
};

const NerveLabel = ({ text, position, color = "bg-white/90 text-slate-900" }: any) => (
    <Html position={position} center distanceFactor={10}>
        <div className={`px-3 py-1 ${color} backdrop-blur-sm border border-pink-200 rounded-lg shadow-xl cursor-default select-none`}>
            <span className="text-[10px] font-black tracking-tighter whitespace-nowrap uppercase">
                {text}
            </span>
        </div>
    </Html>
);
