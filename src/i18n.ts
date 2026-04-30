import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Optimized i18n configuration
// Removed 130KB+ of multi-language bloat to improve TTI and bundle size.
// Application now defaults to English for maximum performance.

const resources = {
    en: {
        translation: {
            settings: {
                title: "Settings",
                account: "Account",
                account_sub: "Security notifications, change number",
                privacy: "Privacy",
                privacy_sub: "Block contacts, disappearing messages",
                subscription: "Subscription",
                notifications: "Notifications",
                notifications_sub: "Message, group & call tones",
                language: "App Language",
                language_sub: "English (device's language)",
                appearance: "Appearance",
                appearance_sub: "Theme, wallpapers",
                help: "Help",
                help_sub: "Help center, contact us, privacy policy",
                invite: "Invite a Friend",
                logout: "Log Out",
                status: "Available • Study Mode",
                account_edit: "Edit Profile",
                display_name: "Display Name",
                username: "Username",
                save_profile: "Save Profile",
                avatar_updated: "Profile picture updated!",
                profile_updated: "Profile updated successfully.",
                privacy_options: {
                    last_seen: "Last Seen",
                    profile_photo: "Profile Photo",
                    about: "About",
                    status: "Status",
                    read_receipts: "Read Receipts",
                    everyone: "Everyone",
                    contacts: "My Contacts",
                    nobody: "Nobody"
                },
                security: {
                    mfa: "Two-Factor Auth",
                    change_password: "Change Password",
                    google_managed: "Managed by Google",
                    mfa_sub: "Extra layer of security"
                }
            },
            menu: {
                main: "Main Menu",
                history: "Practice History",
                mock: "Mock Exams",
                bookmarks: "Saved Questions",
                labs: "3D Virtual Labs",
                apply: "Apply University",
                community: "Study Community",
                admin: "Admin Terminal",
                settings: "App Settings",
                logout: "Log Out",
                restricted: "Restricted Access",
                online: "Status: Online",
                exam_change: "Change Exam",
                active_course: "Active Course",
                dashboard: "Dashboard"
            },
            dashboard: {
                daily_stats: "Daily Stats",
                solved: "Solved",
                accuracy: "Accuracy",
                streak: "Day Streak",
                total_q: "Total Questions",
                recent_activity: "Recent Activity",
                continue: "Continue",
                score: "Points",
                champions_league: "Champions League",
                top_students: "Top Students",
                mastery: "Subject Mastery",
                mastery_sub: "Your strength analysis",
                weak: "Needs Work",
                strong: "Strong",
                average: "Average",
                no_data: "No data available",
                start_practicing: "Start Practicing"
            },
            common: {
                save: "Save",
                cancel: "Cancel",
                back: "Back",
                loading: "Loading...",
                resources: "Resources",
                login: "Log In",
                start_free: "Start FREE Practice",
                numbers: {
                    first: "First",
                    second: "Second",
                    third: "Third",
                    last: "Last"
                },
                logo_alt: "ItaloStudy Logo - University Entrance Exam Preparation"
            },
            nav: {
                method: "Method",
                exams: "Exams",
                resources: "Resources",
                pricing: "Pricing",
                blog: "Blog",
                contact: "Contact",
                login: "Log In",
                dashboard: "Dashboard",
                exam_items: {
                    cents: "CEnT-S 2026",
                    imat: "Prep IMAT",
                    tolce: "TOLC-E",
                    tili: "TIL-I"
                }
            },
            footer: {
                links: {
                    method: "Method",
                    pricing: "Pricing",
                    blog: "Blog",
                    contact: "Contact"
                },
                cta_title: "Ready to Secure Your Spot in Italy?",
                cta_desc: "The most precise admission strategy for 2026."
            },
            method: {
                badge: "The ItaloStudy Standard",
                hero_title_prefix: "Designed for Academic",
                hero_title_highlight: "Excellence.",
                hero_desc: "Our multi-layered cognitive framework meticulously engineered to accelerate mastery in medical and scientific disciplines.",
                steps: {
                    diagnostic_title: "Diagnostic Phase",
                    diagnostic_desc: "We identify your cognitive profile across all scientific domains with a comprehensive initial diagnostic assessment.",
                    training_title: "Intelligent Training",
                    training_desc: "Our proprietary learning engine generates personalized question sets targeting your specific knowledge gaps.",
                    retention_title: "Knowledge Retention",
                    retention_desc: "Questions reappear at mathematically optimal intervals to ensure permanent knowledge integration and mastery.",
                    mock_title: "Mock Exams",
                    mock_desc: "Execute high-pressure practice sessions under official exam conditions with live proctoring systems."
                },
                features: {
                    adaptive: "Adaptive Difficulty",
                    adaptive_desc: "Our algorithms dynamically adjust question complexity based on your performance data, second by second.",
                    benchmarking: "Global Benchmarking",
                    benchmarking_desc: "Compare your retention speed and accuracy against 12,000+ students worldwide in real-time.",
                    pattern: "Pattern Recognition",
                    pattern_desc: "We don't just teach facts; we train your brain to recognize the architectural logic behind exam questions."
                },
                cta: {
                    title_prefix: "Ready to Master the",
                    title_highlight: "ItaloStudy Experience?",
                    subtitle: "Join the ranks of elite students worldwide.",
                    button: "Start Practice"
                }
            },
            landing: {
                header: {
                    beta_free: "BETA FREE"
                },
                hero: {
                    badge: "NEW GEN ITALOSTUDY TEAM",
                    title_prefix: "Ace Your CENT-S & IMAT PREP",
                    title_highlight: "with ItaloStudy",
                    title_sub: "The Smartest Way to Pass Your Italian Entrance Exam",
                    description: "Everything you need to prepare for — practice, analysis, and guidance designed to help you perform at your best.",
                    exam_placeholder: "Entrance Exams",
                    cta_start: "Start FREE",
                    cta_blog: "Read Blog",
                    explore_blog: "Explore Blog",
                    stats: {
                        pass_rate: "98%",
                        pass_rate_label: "Pass Rate",
                        students: "5,000+",
                        students_label: "Students",
                        mock_exams: "Expert-Led",
                        mock_exams_label: "Mock Exams",
                        prep_rank: "#1",
                        prep_rank_label: "CEnT-S Prep"
                    }
                },
                features: {
                    adaptive_title: "Adaptive Learning",
                    adaptive_desc: "Questions adjust to your knowledge level in real-time, targeting your weak areas for rapid improvement.",
                    simulation_title: "Real Exam Simulation",
                    simulation_desc: "Practice under the exact conditions and timing you'll face in the actual exam.",
                    ranked_title: "Global Leaderboards",
                    ranked_desc: "Compete with students worldwide and track your ranking across different subjects."
                },
                testimonials: {
                    badge: "Success Stories",
                    title: "Trusted by",
                    title_highlight: "12K+ Students",
                    subtitle: "Students from over 30 countries use ItaloStudy to prepare for their dream universities.",
                    john_text: "ItaloStudy was crucial to my IMAT success. The unlimited mocks and detailed analytics helped me understand exactly where I needed to improve.",
                    john_role: "Medical Student, Italy",
                    anna_text: "The practice questions and real-time feedback system made all the difference in my SAT preparation. Highly recommend!",
                    anna_role: "Engineering Student, Germany"
                },
                faq: {
                    title: "Frequently Asked Questions",
                    subtitle: "Everything you need to know about ItaloStudy",
                    description: "Everything you need to know about the 2026 admissions cycle and ItaloStudy.",
                    q1: "How does ItaloStudy help me prepare for the CENT-S 2026 medical exam?",
                    a1: "ItaloStudy provides the world's most advanced study simulator specifically built for the 2026 Italian medical entrance exams. Our platform offers unlimited realistic mock exams, a comprehensive database of past papers, and detailed AI-driven analytics.",
                    q2: "Is the ItaloStudy simulator really free for international students?",
                    a2: "Yes! We are currently in our Global Beta phase, which means access to our core CENT-S and IMAT study simulators is completely free for all users.",
                    q3: "How accurate are the ItaloStudy mock exams compared to the real 2026 test?",
                    a3: "Our mock exams are meticulously crafted by medical education experts to mirror the exact difficulty levels, topic distribution, and timing of the real 2026 exams.",
                    q4: "What are the requirements for international students to study in Italy in 2026?",
                    a4: "For 2026, you generally need 12 years of total education, English proficiency (IELTS/TOEFL), and passing required entrance exams like CENT-S or IMAT.",
                    q5: "Is it possible to study in Italy for free or with a scholarship in 2026?",
                    a5: "Yes! Most international students qualify for the DSU scholarship, which can provide a full tuition waiver and a cash stipend of up to €7,000 per year.",
                    q6: "What is the ISEE and how does it reduce my tuition fees in Italy?",
                    a6: "The ISEE is a financial document used by Italian universities to assess your economic situation and qualify you for the lowest tuition fee brackets.",
                    q7: "How do I apply for a student visa for Italy in 2026?",
                    a7: "The process begins with pre-enrollment on UniversItaly. After validation, you apply for a Type D Student Visa at the Italian Consulate in your country.",
                    q8: "Are there English-taught degrees in Italy for international students?",
                    a8: "Yes, Italy offers over 500 English-taught programs for 2026, including Medicine, Engineering, Architecture, and Humanities.",
                    q9: "Can I work part-time while studying in Italy in 2026?",
                    a9: "Yes, international students on a student visa are legally permitted to work up to 20 hours per week during the academic year.",
                    q10: "When do applications open for Italian universities in 2026?",
                    a10: "Most universities start their first call for applications for the 2026 intake between February and April 2026."
                }
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
