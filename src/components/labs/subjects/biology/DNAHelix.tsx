import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';

export const DNAHelix = () => {
    const groupRef = useRef<THREE.Group>(null);
    const strands = 24;
    const radius = 2;
    const height = 12;

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.01;
            groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        }
    });

    const points = useMemo(() => {
        const pts = [];
        for (let i = 0; i < strands; i++) {
            const y = (i / strands) * height - height / 2;
            const angle = (i / strands) * Math.PI * 4;

            // Major Strand
            pts.push({
                pos: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
                color: '#6366f1',
                label: 'Sugar-Phosphate Back'
            });

            // Minor Strand
            pts.push({
                pos: [Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius],
                color: '#ec4899',
                label: 'Sugar-Phosphate Back'
            });
        }
        return pts;
    }, []);

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <group ref={groupRef}>
                {points.map((p, i) => (
                    <group key={i}>
                        <mesh position={p.pos as any}>
                            <sphereGeometry args={[0.22, 16, 16]} />
                            <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.8} roughness={0.1} />
                        </mesh>
                        {i % 2 === 0 && (
                            <group>
                                <mesh position={[0, p.pos[1], 0]} rotation={[0, (i / strands) * Math.PI * 4, 0]}>
                                    <boxGeometry args={[radius * 2, 0.08, 0.08]} />
                                    <meshStandardMaterial color="#94a3b8" transparent opacity={0.4} metalness={1} />
                                </mesh>
                                {(i % 8 === 0) && (
                                    <Html position={[0, p.pos[1], 0]} center distanceFactor={10}>
                                        <div className="px-2 py-0.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded text-[7px] font-black text-slate-900 uppercase">
                                            {i % 16 === 0 ? 'Cytosine-Guanine' : 'Adenine-Thymine'}
                                        </div>
                                    </Html>
                                )}
                            </group>
                        )}
                    </group>
                ))}
            </group>
        </Float>
    );
};
