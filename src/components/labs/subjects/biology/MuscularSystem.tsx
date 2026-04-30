import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import * as THREE from 'three';

export const MuscularSystem = () => {
    const muscleRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (muscleRef.current) {
            const time = state.clock.elapsedTime * 2;
            const contraction = Math.sin(time) * 0.5 + 0.5; // 0 to 1
            muscleRef.current.scale.x = 1 + contraction * 0.4;
            muscleRef.current.scale.y = 1 - contraction * 0.2;
        }
    });

    return (
        <group>
            {/* Humerus (Arm Bone) */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
                <capsuleGeometry args={[0.2, 4, 8, 16]} />
                <meshStandardMaterial color="#f1f5f9" />
                <MuscleLabel text="HUMERUS" position={[1, 1, 0]} />
            </mesh>

            {/* Bicep Muscle (Contracting) */}
            <mesh ref={muscleRef} position={[0.4, 0.8, 0]} rotation={[0, 0, -Math.PI / 4]}>
                <sphereGeometry args={[0.6, 32, 32]} />
                <meshStandardMaterial color="#b91c1c" roughness={0.3} metalness={0.1} />
                <MuscleLabel text="BICEP (BRACHII)" position={[0.8, 0, 0]} color="bg-red-600 text-white" />
            </mesh>

            {/* Tendon */}
            <mesh position={[1, 1.4, 0]} rotation={[0, 0, -Math.PI / 4]}>
                <capsuleGeometry args={[0.05, 1, 4, 16]} />
                <meshStandardMaterial color="#cbd5e1" />
                <MuscleLabel text="TENDON" position={[0.5, 0.3, 0]} />
            </mesh>

            <Html position={[0, -2, 0]} center>
                <div className="px-4 py-2 bg-slate-900/80 rounded-xl border border-white/10 text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                    ANIMATION: Contraction / Relaxation
                </div>
            </Html>
        </group>
    );
};

const MuscleLabel = ({ text, position, color = "bg-white/90 text-slate-900" }: any) => (
    <Html position={position} center distanceFactor={10}>
        <div className={`px-3 py-1 ${color} backdrop-blur-sm border border-red-200 rounded-lg shadow-xl cursor-default select-none`}>
            <span className="text-[10px] font-black tracking-tighter whitespace-nowrap uppercase">
                {text}
            </span>
        </div>
    </Html>
);
