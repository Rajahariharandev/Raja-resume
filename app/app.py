from flask import Flask, render_template, request, jsonify
from datetime import datetime

app = Flask(__name__)

# ── Portfolio Data ──────────────────────────────────────────────────────────
PORTFOLIO = {
    "name": "Rajahariharan K",
    "title": "Assistant Lead – Python Developer – Full Stack Devloper",
    "subtitle": "Backend Automation | Team Leadership | REST APIs",
    "location": "Trichy, Tamil Nadu, India",
    "phone": "+91 63838 52354",
    "email": "rajahariharan2244@gmail.com",
    "portfolio_url": "https://rajahariharan-portfolio.netlify.app",
    "summary": (
        "Promoted Python Developer and Assistant Lead with 3+ years of experience "
        "building automation scripts, backend microservices, and REST API integrations. "
        "Recognized for technical leadership — elevated to Assistant Lead within the same "
        "organization for consistently delivering high-impact automation solutions and "
        "mentoring development teams. Proven track record in Python (Django, FastAPI), "
        "GitLab CI/CD pipelines, SQL optimization, and Agile delivery. Actively expanding "
        "into AWS cloud services to strengthen end-to-end automation capabilities."
    ),
    "stats": [
        {"value": "3+", "label": "Years Experience"},
        {"value": "30%", "label": "Performance Boost"},
        {"value": "70%", "label": "Manual Effort Reduced"},
        {"value": "5x",  "label": "Scalability Gain"},
    ],
    "skills": [
        {
            "id": "python",
            "title": "Python & Scripting",
            "color": "#6366f1",
            "icon": "python",
            "tags": ["Python 3.x", "Django", "FastAPI", "Automation Scripts", "Shell/Bash Scripting", "PHP"],
        },
        {
            "id": "automation",
            "title": "Automation & Quality",
            "color": "#06b6d4",
            "icon": "automation",
            "tags": ["REST API Automation", "Automation Frameworks", "Code Reviews", "Best Practices", "pytest (learning)"],
        },
        {
            "id": "backend",
            "title": "Backend & Architecture",
            "color": "#8b5cf6",
            "icon": "backend",
            "tags": ["Node.js (Express)", "Golang", "Microservices", "RBAC", "JWT Authentication", "SOAP-to-REST Migration"],
        },
        {
            "id": "databases",
            "title": "Databases",
            "color": "#10b981",
            "icon": "database",
            "tags": ["PostgreSQL", "Oracle", "MySQL", "SQL Optimization", "Schema Design", "Redis Caching"],
        },
        {
            "id": "devops",
            "title": "DevOps & CI/CD",
            "color": "#f59e0b",
            "icon": "devops",
            "tags": ["Git", "GitLab CI/CD", "Docker", "Linux CLI", "Postman", "VSCode", "AWS (learning)"],
        },
        {
            "id": "leadership",
            "title": "Leadership",
            "color": "#ec4899",
            "icon": "leadership",
            "tags": ["Team Leadership", "Technical Mentorship", "Sprint Planning", "Cross-Functional Collaboration", "Agile/Scrum"],
        },
    ],
    "proficiency": [
        {"label": "Python / Django / FastAPI", "pct": 95, "color": "#6366f1"},
        {"label": "REST API & Automation",     "pct": 90, "color": "#06b6d4"},
        {"label": "SQL & Database Design",     "pct": 85, "color": "#10b981"},
        {"label": "GitLab CI/CD & Docker",     "pct": 80, "color": "#f59e0b"},
        {"label": "Node.js / Golang",          "pct": 70, "color": "#8b5cf6"},
        {"label": "AWS (S3, SNS, SQS)",        "pct": 40, "color": "#ec4899"},
    ],
    "experience": [
        {
            "id": "exp1",
            "role": "Assistant Lead",
            "badge": "▲ PROMOTED",
            "badge_class": "badge-promoted",
            "company": "The SCM Silk Private Limited",
            "period": "Feb 2026 – Present",
            "highlights": [
                {
                    "title": "Technical Leadership",
                    "detail": "Appointed as Assistant Lead within 12 months, overseeing end-to-end Python automation delivery across multiple sprint teams — ensuring architectural consistency and code quality standards.",
                },
                {
                    "title": "Automation Strategy",
                    "detail": "Driving design and implementation of scalable Python automation frameworks, reducing cross-team manual effort and establishing reusable script libraries adopted organization-wide.",
                },
                {
                    "title": "Mentoring & Reviews",
                    "detail": "Conducting structured code reviews and 1:1 mentoring sessions for junior developers, improving team code quality and onboarding speed while enforcing software development best practices.",
                },
                {
                    "title": "Stakeholder Collaboration",
                    "detail": "Liaising with cross-functional stakeholders to gather automation requirements, translate business needs into technical solutions, and report delivery progress in Agile sprint cycles.",
                },
            ],
            "tags": ["Python", "Agile", "Team Lead", "Code Reviews", "Automation"],
        },
        {
            "id": "exp2",
            "role": "Associate Software Developer",
            "badge": "Developer",
            "badge_class": "badge-regular",
            "company": "The SCM Silk Private Limited",
            "period": "2025 – Jan 2026",
            "highlights": [
                {
                    "title": "Python Automation",
                    "detail": "Developed and maintained Python automation scripts for ERP data-sync workflows, eliminating ~6 hours/week of manual processing and improving backend throughput by 30%.",
                },
                {
                    "title": "API & Framework Design",
                    "detail": "Built internal REST automation frameworks (FastAPI/Django/Golang) integrating legacy ERP systems with modern web frontends, achieving a 5x improvement in system scalability.",
                },
                {
                    "title": "Performance Optimization",
                    "detail": "Reduced server response time by 30% through Redis caching and Python-driven SQL query optimization, supporting high-concurrency, low-latency data processing.",
                },
            ],
            "tags": ["FastAPI", "Django", "Golang", "Redis", "SQL", "ERP"],
        },
        {
            "id": "exp3",
            "role": "Junior Associate – Software Developer",
            "badge": "Junior",
            "badge_class": "badge-junior",
            "company": "The Chennai Silks HO",
            "period": "2023 – 2025",
            "highlights": [
                {
                    "title": "Automation Scripting",
                    "detail": "Authored Python (Django) automation scripts for front-end data pipelines, improving user engagement by 15% and reducing manual data handling across web modules.",
                },
                {
                    "title": "Database Automation",
                    "detail": "Designed Python-based Oracle and PostgreSQL migration scripts, maintaining zero data-loss integrity across large-scale datasets and reducing migration effort by ~40%.",
                },
                {
                    "title": "Agile Collaboration",
                    "detail": "Contributed to Agile/Scrum ceremonies, technical documentation, and collaborative code reviews — delivering backend solutions aligned with cross-functional requirements.",
                },
            ],
            "tags": ["Django", "Oracle", "PostgreSQL", "Scrum", "Python"],
        },
    ],
    "projects": [
        {
            "id": "project1",
            "title": "SOAP-to-REST Migration",
            "icon": "lightning",
            "color": "#6366f1",
            "tags": ["Python", "Golang", "GitLab CI/CD"],
            "description": (
                "Refactored a legacy enterprise SOAP architecture into a Python/Golang REST API "
                "with automated deployment via GitLab CI/CD pipelines — achieving 5x scalability "
                "and significantly reducing long-term maintenance overhead."
            ),
            "metrics": [
                {"value": "5x", "label": "Scalability"},
                {"value": "↓ Ops", "label": "Maintenance"},
                {"value": "Auto", "label": "Deployment"},
            ],
        },
        {
            "id": "project2",
            "title": "Employee RBAC Permission System",
            "icon": "lock",
            "color": "#06b6d4",
            "tags": ["Node.js", "Python", "JWT"],
            "description": (
                "Engineered a Role-Based Access Control system with JWT authentication and "
                "automated permission workflows — cutting manual access provisioning by 70% "
                "and securing sensitive data across the organization."
            ),
            "metrics": [
                {"value": "70%", "label": "Less Manual Work"},
                {"value": "JWT", "label": "Auth"},
                {"value": "Secure", "label": "Data Access"},
            ],
        },
    ],
    "education": [
        {
            "id": "edu1",
            "degree": "Bachelor of Computer Applications (BCA)",
            "institution": "Pavendra Bharathidasan College of Arts & Science",
            "period": "2019 – 2022",
            "score": "80%",
            "score_pct": 80,
            "type": "degree",
        },
        {
            "id": "edu2",
            "degree": "Full Stack Python Certification",
            "institution": "Indra Institute of Education, Coimbatore",
            "period": "2023",
            "score": None,
            "score_pct": None,
            "type": "cert",
        },
    ],
    "learning": [
        {"title": "AWS Cloud Services", "detail": "S3, SNS, SQS — aligning with cloud-native automation roles", "color": "#f59e0b"},
        {"title": "pytest Framework",   "detail": "Advanced testing patterns for Python automation",             "color": "#10b981"},
    ],
    "year": datetime.now().year,
}


# ── Routes ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html", p=PORTFOLIO)


@app.route("/api/contact", methods=["POST"])
def contact():
    data = request.get_json(force=True)
    name    = data.get("name", "").strip()
    email   = data.get("email", "").strip()
    subject = data.get("subject", "").strip()
    message = data.get("message", "").strip()

    if not name or not email or not message:
        return jsonify({"success": False, "error": "Please fill in all required fields."}), 400

    # In a real deployment, send an email here.
    print(f"\n📩 New contact message from {name} <{email}>")
    print(f"   Subject : {subject}")
    print(f"   Message : {message}\n")

    return jsonify({"success": True, "message": f"Thanks {name}! Your message has been received."})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
