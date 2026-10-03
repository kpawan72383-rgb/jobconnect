package com.jobconnect;

import lombok.RequiredArgsConstructor;import org.springframework.data.domain.Sort;import org.springframework.http.HttpStatus;import org.springframework.transaction.annotation.Transactional;import org.springframework.web.bind.annotation.*;import org.springframework.web.multipart.MultipartFile;import org.springframework.web.server.ResponseStatusException;import java.io.IOException;import java.nio.file.*;import java.util.*;

@RestController @RequestMapping("/api") @RequiredArgsConstructor
public class ApiController {
  private final Auth auth; private final SeekerRepo seekers; private final EmployerRepo employers; private final JobRepo jobs;
  private final AppRepo apps; private final SavedRepo saved; private final SkillRepo skills; private final AppService svc;
  private final NotificationRepo notifications;
  private static final Set<String> STATUSES = Set.of("APPLIED","UNDER_REVIEW","SHORTLISTED","INTERVIEW","SELECTED","REJECTED");

  private JobSeeker seeker(){ return seekers.findByUser(auth.get(Role.JOB_SEEKER)).orElseThrow(() -> Auth.bad("Profile not found")); }
  private Employer employer(){ return employers.findByUser(auth.get(Role.EMPLOYER)).orElseThrow(() -> Auth.bad("Company not found")); }
  private Job job(Long id){ return jobs.findById(id).orElseThrow(() -> Auth.bad("Job not found")); }
  private Job myJob(Long id){
    Employer e = employer(); Job j = job(id);
    if (!j.getEmployer().getEmployerId().equals(e.getEmployerId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This is not your job posting");
    return j;
  }
  private static String s(Map<String,String> m, String k){ String v = m.get(k); return v == null ? null : v.trim(); }
  private static void copy(Job f, Job t){
    if (f.getTitle() == null || f.getTitle().isBlank()) throw Auth.bad("Job title is required");
    t.setTitle(f.getTitle().trim()); t.setLocation(f.getLocation()); t.setSalary(f.getSalary());
    t.setSalaryMin(f.getSalaryMin() == null ? 0 : f.getSalaryMin()); t.setExperience(f.getExperience());
    t.setJobType(f.getJobType()); t.setSkills(f.getSkills()); t.setDescription(f.getDescription());
    t.setResponsibilities(f.getResponsibilities()); t.setQualifications(f.getQualifications()); // V2
    t.setDeadline(f.getDeadline()); // V2
    t.setStatus("CLOSED".equals(f.getStatus()) ? "CLOSED" : "ACTIVE");
  }

  // ---------- public: skills + job search ----------
  @GetMapping("/skills") public List<Skill> skills(){ return skills.findAll(Sort.by("skillName")); }
  @GetMapping("/jobs")
  public List<Job> search(@RequestParam(defaultValue="") String q, @RequestParam(defaultValue="") String location,
      @RequestParam(defaultValue="") String type, @RequestParam(defaultValue="") String experience,
      @RequestParam(defaultValue="0") double salary, @RequestParam(defaultValue="") String skill){
    return jobs.search(q.trim(), location.trim(), type.trim(), experience.trim(), salary, skill.trim());
  }
  @GetMapping("/jobs/{id}") public Job one(@PathVariable Long id){ return job(id); }
  // V2: applicant count for a job
  @GetMapping("/jobs/{id}/applicant-count") public Map<String,Long> applicantCount(@PathVariable Long id){ return Map.of("count", (long) apps.findByJob(job(id)).size()); }

  // ---------- job seeker ----------
  @GetMapping("/seeker/profile") public JobSeeker profile(){ return seeker(); }
  @PutMapping("/seeker/profile") @Transactional
  public JobSeeker saveProfile(@RequestBody Map<String,String> b){
    JobSeeker p = seeker();
    if (b.get("name") != null && !b.get("name").isBlank()) p.getUser().setName(s(b,"name"));
    p.setPhone(s(b,"phone")); p.setLocation(s(b,"location")); p.setEducation(s(b,"education"));
    p.setSkills(s(b,"skills")); p.setExperience(s(b,"experience")); p.setAbout(s(b,"about"));
    // V2 fields
    p.setCareerObjective(s(b,"careerObjective")); p.setCollege(s(b,"college"));
    p.setDegree(s(b,"degree")); p.setGraduationYear(s(b,"graduationYear"));
    p.setProjects(s(b,"projects")); p.setCertifications(s(b,"certifications"));
    p.setLinkedin(s(b,"linkedin")); p.setGithub(s(b,"github"));
    return seekers.save(p);
  }
  @PostMapping("/seeker/resume")
  public Map<String,String> resume(@RequestParam MultipartFile file) throws IOException {
    JobSeeker p = seeker();
    String n = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
    // V2: allow PDF, DOC, DOCX
    if (file.isEmpty() || !(n.endsWith(".pdf") || n.endsWith(".doc") || n.endsWith(".docx")))
      throw Auth.bad("Upload your resume as a PDF, DOC, or DOCX file");
    if (file.getSize() > 5 * 1024 * 1024) throw Auth.bad("File size must be under 5 MB");
    Path dir = Path.of("uploads").toAbsolutePath(); Files.createDirectories(dir);
    String ext = n.substring(n.lastIndexOf('.'));
    String name = "resume_" + p.getSeekerId() + "_" + System.currentTimeMillis() + ext;
    file.transferTo(dir.resolve(name));
    p.setResume("/uploads/" + name); seekers.save(p);
    return Map.of("resume", p.getResume());
  }
  @PostMapping("/jobs/{id}/apply") public Application apply(@PathVariable Long id){ return svc.apply(job(id), seeker()); }
  @GetMapping("/seeker/applications") public List<Application> myApps(){ return apps.findBySeekerOrderByAppliedAtDesc(seeker()); }
  @GetMapping("/seeker/saved") public List<SavedJob> mySaved(){ return saved.findBySeekerOrderBySavedAtDesc(seeker()); }
  @PostMapping("/jobs/{id}/save")
  public void save(@PathVariable Long id){
    JobSeeker p = seeker(); Job j = job(id);
    if (saved.findBySeekerAndJob(p, j).isEmpty()) { SavedJob sj = new SavedJob(); sj.setSeeker(p); sj.setJob(j); saved.save(sj); }
  }
  @DeleteMapping("/jobs/{id}/save")
  public void unsave(@PathVariable Long id){ JobSeeker p = seeker(); saved.findBySeekerAndJob(p, job(id)).ifPresent(saved::delete); }

  // V2: Seeker dashboard stats
  @GetMapping("/seeker/dashboard")
  public Map<String,Object> seekerDash(){
    JobSeeker s = seeker();
    Map<String,Object> m = new LinkedHashMap<>();
    m.put("totalApplications", apps.countBySeeker(s));
    m.put("applied", apps.countBySeekerAndStatus(s, "APPLIED"));
    m.put("underReview", apps.countBySeekerAndStatus(s, "UNDER_REVIEW"));
    m.put("shortlisted", apps.countBySeekerAndStatus(s, "SHORTLISTED"));
    m.put("interview", apps.countBySeekerAndStatus(s, "INTERVIEW"));
    m.put("selected", apps.countBySeekerAndStatus(s, "SELECTED"));
    m.put("rejected", apps.countBySeekerAndStatus(s, "REJECTED"));
    m.put("savedJobs", saved.countBySeeker(s));
    m.put("recentApplications", apps.findBySeekerOrderByAppliedAtDesc(s).stream().limit(5).toList());
    m.put("recommendations", svc.recommend(s));
    return m;
  }
  // V2: Recommendations endpoint
  @GetMapping("/seeker/recommendations")
  public List<Map<String,Object>> recommendations(){ return svc.recommend(seeker()); }

  // ---------- employer ----------
  @GetMapping("/employer/profile") public Employer company(){ return employer(); }
  @PutMapping("/employer/profile")
  public Employer saveCompany(@RequestBody Map<String,String> b){
    Employer e = employer();
    if (b.get("companyName") == null || b.get("companyName").isBlank()) throw Auth.bad("Company name is required");
    e.setCompanyName(s(b,"companyName")); e.setDescription(s(b,"description")); e.setLocation(s(b,"location")); e.setWebsite(s(b,"website"));
    return employers.save(e);
  }
  @GetMapping("/employer/jobs") public List<Job> myJobs(){ return jobs.findByEmployerOrderByCreatedAtDesc(employer()); }
  @PostMapping("/employer/jobs")
  public Job post(@RequestBody Job b){ Job j = new Job(); copy(b, j); j.setEmployer(employer()); return jobs.save(j); }
  @PutMapping("/employer/jobs/{id}")
  public Job edit(@PathVariable Long id, @RequestBody Job b){ Job j = myJob(id); copy(b, j); return jobs.save(j); }
  @PutMapping("/employer/jobs/{id}/status")
  public Job jobStatus(@PathVariable Long id, @RequestBody Map<String,String> b){
    Job j = myJob(id); j.setStatus("CLOSED".equals(b.get("status")) ? "CLOSED" : "ACTIVE"); return jobs.save(j);
  }
  @DeleteMapping("/employer/jobs/{id}") public void remove(@PathVariable Long id){ svc.deleteJob(myJob(id)); }
  @GetMapping("/employer/jobs/{id}/applications") public List<Application> applicants(@PathVariable Long id){ return apps.findByJob(myJob(id)); }
  @PutMapping("/employer/applications/{id}/status")
  public Application setStatus(@PathVariable Long id, @RequestBody Map<String,String> b){
    Application a = apps.findById(id).orElseThrow(() -> Auth.bad("Application not found"));
    myJob(a.getJob().getJobId());
    if (!STATUSES.contains(b.get("status"))) throw Auth.bad("Unknown status");
    return svc.updateStatus(a, b.get("status"));
  }
  // V2: Employer dashboard stats
  @GetMapping("/employer/dashboard")
  public Map<String,Object> employerDash(){
    Employer e = employer();
    List<Job> myJobs = jobs.findByEmployerOrderByCreatedAtDesc(e);
    long totalApplicants = myJobs.stream().mapToLong(j -> apps.findByJob(j).size()).sum();
    List<Application> recentApps = new ArrayList<>();
    for (Job j : myJobs) recentApps.addAll(apps.findByJob(j));
    recentApps.sort((a, b2) -> b2.getAppliedAt().compareTo(a.getAppliedAt()));
    Map<String,Object> m = new LinkedHashMap<>();
    m.put("totalJobs", jobs.countByEmployer(e));
    m.put("activeJobs", jobs.countByEmployerAndStatus(e, "ACTIVE"));
    m.put("closedJobs", jobs.countByEmployerAndStatus(e, "CLOSED"));
    m.put("totalApplicants", totalApplicants);
    m.put("recentApplicants", recentApps.stream().limit(5).toList());
    return m;
  }

  // ---------- V2: Notifications ----------
  @GetMapping("/notifications")
  public List<Notification> getNotifications(){ User u = auth.get(); return notifications.findByUserOrderByCreatedAtDesc(u); }
  @GetMapping("/notifications/unread-count")
  public Map<String,Long> unreadCount(){ User u = auth.get(); return Map.of("count", notifications.countByUserAndReadFalse(u)); }
  @PutMapping("/notifications/{id}/read")
  public void markRead(@PathVariable Long id){
    User u = auth.get();
    Notification n = notifications.findById(id).orElseThrow(() -> Auth.bad("Notification not found"));
    if (!n.getUser().getUserId().equals(u.getUserId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your notification");
    n.setRead(true); notifications.save(n);
  }
  @PutMapping("/notifications/read-all")
  public void markAllRead(){
    User u = auth.get();
    List<Notification> unread = notifications.findByUserAndReadFalseOrderByCreatedAtDesc(u);
    unread.forEach(n -> n.setRead(true)); notifications.saveAll(unread);
  }
}
