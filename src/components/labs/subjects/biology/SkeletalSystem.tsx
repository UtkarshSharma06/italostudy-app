import React from 'react';
import { Float, Html } from '@react-three/drei';

export const SkeletalSystem = () => {
    return (
        <group>
            {/* Spine */}
            <mesh position={[0, -1, 0]}>
                <capsuleGeometry args={[0.2, 4, 8, 16]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
                <BoneLabel text="VERTEBRAL COLUMN" position={[0.5, 1, 0]} />
            </mesh>

            {/* Skull */}
            <mesh position={[0, 1.5, 0]}>
                <sphereGeometry args={[0.6, 32, 32]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
                <BoneLabel text="SKULL (CRANIUM)" position={[0.8, 0, 0]} />
            </mesh>

            {/* Ribcage */}
            <group position={[0, 0, 0]}>
                {[1, 0.7, 0.4, 0.1, -0.2, -0.5].map((y, i) => (
                    <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[1 - i * 0.05, 0.05, 16, 100, Math.PI]} />
                        <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
                    </mesh>
                ))}
                <BoneLabel text="THORACIC CAGE (RIBS)" position={[-1.2, 0.5, 0]} />
            </group>

            {/* Pelvis */}
            <mesh position={[0, -1.8, 0]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.8, 0.2, 16, 100, Math.PI]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
                <BoneLabel text="PELVIS" position={[1, -0.5, 0]} />
            </mesh>

            {/* Femur (Legs) */}
            <group position={[0, -2, 0]}>
                <mesh position={[-0.6, -1.5, 0]} rotation={[0, 0, 0.1]}>
                    <capsuleGeometry args={[0.15, 2.5, 4, 16]} />
                    <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
                </mesh>
                <mesh position={[0.6, -1.5, 0]} rotation={[0, 0, -0.1]}>
                    <capsuleGeometry args={[0.15, 2.5, 4, 16]} />
                    <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
                </mesh>
                <BoneLabel text="FEMUR" position={[1.2, -2, 0]} />
            </group>
        </group>
    );
};

const BoneLabel = ({ text, position }: { text: string, position: [number, number, number] }) => (
    <Html position={position} center distanceFactor={10}>
        <div className="px-3 py-1 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg shadow-xl cursor-default select-none pointer-events-none">
            <span className="text-[10px] font-black text-slate-900 tracking-tighter whitespace-nowrap uppercase">
                {text}
            </span>
        </div>
    </Html>
);
