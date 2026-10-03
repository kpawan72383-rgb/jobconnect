# JobConnect – Online Job Board and Recruitment Platform

Spring Boot 3 (Java 17) + MySQL + REST API + HTML/CSS/JavaScript frontend, following the SRS.

## Run it
1. Install JDK 17, Maven and MySQL. Start MySQL.
2. Edit `src/main/resources/application.properties` (MySQL username and password). The `jobconnect` database and all 7 tables are created automatically.
3. From this folder run: `mvn spring-boot:run` (or open the folder in IntelliJ and run `JobConnectApplication`).
4. Open http://localhost:8080

Default admin: `admin@jobconnect.com` / `admin123`

## Demo flow
1. Register an employer, create a company profile, post a job. 
2. Log in as admin, open Jobs, approve the posting (SRS: admin approves/removes postings).
3. Register a job seeker, fill the profile, upload a PDF resume, search, filter, save and apply.
4. As employer, open Applicants and change status (Under review, Shortlisted, Interview, Selected, Rejected).
5. The seeker sees the new status under Applications.

## Structure (Controller → Service → Repository → MySQL)
- `model`-style entities: User, JobSeeker, Employer, Job, Application, SavedJob, Skill (the 7 tables)
- `AuthController`, `ApiController` (seeker, employer, public search), `AdminController`
- `AppService` holds apply/delete business rules; `Auth` handles tokens and role checks
- `static/` holds the frontend (index.html, style.css, app.js)

## REST API
| Area | Endpoints |
|---|---|
| Auth | POST /api/auth/register, /login, /logout |
| Public | GET /api/jobs?q&location&type&experience&salary&skill, GET /api/jobs/{id}, GET /api/skills |
| Seeker | GET/PUT /api/seeker/profile, POST /api/seeker/resume, POST /api/jobs/{id}/apply, GET /api/seeker/applications, POST/DELETE /api/jobs/{id}/save, GET /api/seeker/saved |
| Employer | GET/PUT /api/employer/profile, GET/POST /api/employer/jobs, PUT/DELETE /api/employer/jobs/{id}, GET /api/employer/jobs/{id}/applications, PUT /api/employer/applications/{id}/status |
| Admin | GET /api/admin/stats, /users, /jobs, /applications, DELETE /users/{id}, PUT /jobs/{id}/approve, DELETE /jobs/{id} |

## Notes for viva
- Passwords are hashed with BCrypt. Login returns a random token that the frontend sends as `Authorization: Bearer <token>`; tokens are kept in memory, so restarting the server logs everyone out.
- `skills` is a plain text column in job_seekers and jobs (the SRS's "first version"). The `skills` table feeds the filter dropdown; job_seeker_skills / job_skills join tables are the planned normalisation.
- One application per job per seeker is enforced by a unique constraint.
