import { useMemo, memo } from 'react';

interface DiagramData {
  type: 'svg' | 'description' | 'coordinates';
  description?: string;
  svg?: string;
  coordinates?: {
    points?: Array<{ x: number; y: number; label?: string }>;
    lines?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    circles?: Array<{ cx: number; cy: number; r: number; label?: string }>;
    rectangles?: Array<{ x: number; y: number; width: number; height: number }>;
  };
}

interface DiagramRendererProps {
  diagram: DiagramData | null;
  className?: string;
}

const DiagramRenderer = memo(function DiagramRenderer({ diagram, className = '' }: DiagramRendererProps) {
  if (!diagram) return null;

  const renderedContent = useMemo(() => {
    if (diagram.type === 'svg' && diagram.svg) {
      // Render inline SVG
      return (
        <div
          className="diagram-svg"
          dangerouslySetInnerHTML={{ __html: diagram.svg }}
        />
      );
    }

    if (diagram.type === 'description' && diagram.description) {
      // Render description with placeholder
      return (
        <div className="diagram-description p-4 bg-secondary/30 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <span className="font-medium text-sm text-foreground">Diagram</span>
          </div>
          <p className="text-sm text-muted-foreground italic">
            {diagram.description}
          </p>
        </div>
      );
    }

    if (diagram.type === 'coordinates' && diagram.coordinates) {
      // Render coordinate-based diagram
      const { points, lines, circles, rectangles } = diagram.coordinates;
      const svgWidth = 300;
      const svgHeight = 200;
      const padding = 30;

      return (
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-md mx-auto"
          style={{ backgroundColor: 'var(--secondary)' }}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="var(--border)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Render lines */}
          {lines?.map((line, index) => (
            <line
              key={`line-${index}`}
              x1={line.x1 + padding}
              y1={svgHeight - line.y1 - padding}
              x2={line.x2 + padding}
              y2={svgHeight - line.y2 - padding}
              stroke="var(--primary)"
              strokeWidth="2"
            />
          ))}

          {/* Render rectangles */}
          {rectangles?.map((rect, index) => (
            <rect
              key={`rect-${index}`}
              x={rect.x + padding}
              y={svgHeight - rect.y - rect.height - padding}
              width={rect.width}
              height={rect.height}
              fill="var(--primary)"
              fillOpacity="0.2"
              stroke="var(--primary)"
              strokeWidth="2"
            />
          ))}

          {/* Render circles */}
          {circles?.map((circle, index) => (
            <g key={`circle-${index}`}>
              <circle
                cx={circle.cx + padding}
                cy={svgHeight - circle.cy - padding}
                r={circle.r}
                fill="var(--primary)"
                fillOpacity="0.2"
                stroke="var(--primary)"
                strokeWidth="2"
              />
              {circle.label && (
                <text
                  x={circle.cx + padding}
                  y={svgHeight - circle.cy - padding}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="12"
                  fill="var(--foreground)"
                >
                  {circle.label}
                </text>
              )}
            </g>
          ))}

          {/* Render points */}
          {points?.map((point, index) => (
            <g key={`point-${index}`}>
              <circle
                cx={point.x + padding}
                cy={svgHeight - point.y - padding}
                r="4"
                fill="var(--primary)"
              />
              {point.label && (
                <text
                  x={point.x + padding + 8}
                  y={svgHeight - point.y - padding + 4}
                  fontSize="12"
                  fill="var(--foreground)"
                >
                  {point.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      );
    }

    console.warn(`Unknown diagram type: ${diagram.type}`);
    return null;
  }, [diagram]);

  if (!renderedContent) return null;

  return (
    <div className={`diagram-container rounded-xl overflow-hidden ${className}`}>
      {renderedContent}
    </div>
  );
});

export default DiagramRenderer;
