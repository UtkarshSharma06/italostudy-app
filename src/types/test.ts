export interface MediaContent {
    type: 'image' | 'table' | 'chart' | 'diagram' | 'graph' | 'pie';

    // Image type
    image?: {
        url: string;
        alt?: string;
        caption?: string;
    };

    // Table type
    table?: {
        headers: string[];
        rows: string[][];
        caption?: string;
    };

    // Chart type
    chart?: {
        chartType: 'bar' | 'line' | 'pie' | 'scatter';
        data: Array<Record<string, any>>;
        xKey?: string;
        yKey?: string;
        title?: string;
        xLabel?: string;
        yLabel?: string;
    };

    // Legacy diagram support
    diagram?: {
        type: 'svg' | 'description' | 'coordinates';
        description?: string;
        svg?: string;
        coordinates?: any;
    };
}

export interface DiagramData {
    type: 'svg' | 'description' | 'coordinates';
    description?: string;
    svg?: string;
    coordinates?: any;
}

export interface Question {
    id: string;
    question_number: number;
    question_text: string;
    options: string[];
    correct_index: number;
    user_answer: number | null;
    is_marked: boolean;
    diagram: any | null;
    media?: MediaContent | null;
    topic: string | null;
    explanation: string;
    subject?: string | null;
    is_saved?: boolean;
    master_question_id?: string;
    practice_question_id?: string | null;
    session_question_id?: string | null;
    source_table?: string;
    is_reported_by_user?: boolean;
    is_corrected?: boolean;
    difficulty?: string;
    passage?: string;
    time_spent_seconds?: number;
    section_name?: string;
    order_index?: number;
}
