import { useParams, useSearchParams } from "react-router-dom";
import ConsultantApplicationLayout from "@/components/consultant/ConsultantApplicationLayout";
import ConsultantApplicationDetail from "@/components/consultant/ConsultantApplicationDetail";

export default function ApplicationReviewPage() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const currentTab = searchParams.get('tab') || 'application';

    return (
        <ConsultantApplicationLayout activeTab={currentTab as any}>
            <ConsultantApplicationDetail applicationId={id!} hideSidebar />
        </ConsultantApplicationLayout>
    );
}
