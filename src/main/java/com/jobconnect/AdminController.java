package com.jobconnect;

import lombok.RequiredArgsConstructor;import org.springframework.data.domain.Sort;import org.springframework.web.bind.annotation.*;import java.util.*;

@RestController @RequestMapping("/api/admin") @RequiredArgsConstructor
public class AdminController {
  private final Auth auth; private final UserRepo users; private final JobRepo jobs; private final AppRepo apps; private final AppService svc;
  private final SkillRepo skills; private final EmployerRepo employers; private final SeekerRepo seekers;

  @GetMapping("/stats") public Map<String,Object> stats(){
    auth.get(Role.ADMIN);
    Map<String,Object> m = new LinkedHashMap<>();
    m.put("totalUsers", users.count()); m.put("jobSeekers", users.countByRole(Role.JOB_SEEKER)); m.put("employers", users.countByRole(Role.EMPLOYER));
    m.put("activeJobs", jobs.countByStatusAndApproved("ACTIVE", true)); m.put("pendingJobs", jobs.countByStatusAndApproved("ACTIVE", false));
    m.put("totalJobs", jobs.count());
    m.put("applications", apps.count()); return m;
  }
  @GetMapping("/users") public List<User> users(){ auth.get(Role.ADMIN); return users.findAll(Sort.by(Sort.Direction.DESC, "createdAt")); }
  @DeleteMapping("/users/{id}") public void deleteUser(@PathVariable Long id){
    auth.get(Role.ADMIN); User u = users.findById(id).orElseThrow(() -> Auth.bad("User not found"));
    if (u.getRole() == Role.ADMIN) throw Auth.bad("Admin accounts cannot be removed"); svc.deleteUser(u);
  }
  @GetMapping("/jobs") public List<Job> jobs(){ auth.get(Role.ADMIN); return jobs.findAll(Sort.by(Sort.Direction.DESC, "createdAt")); }
  @PutMapping("/jobs/{id}/approve") public Job approve(@PathVariable Long id){
    auth.get(Role.ADMIN); Job j = jobs.findById(id).orElseThrow(() -> Auth.bad("Job not found")); j.setApproved(true); return jobs.save(j);
  }
  @DeleteMapping("/jobs/{id}") public void deleteJob(@PathVariable Long id){
    auth.get(Role.ADMIN); svc.deleteJob(jobs.findById(id).orElseThrow(() -> Auth.bad("Job not found")));
  }
  @GetMapping("/applications") public List<Application> applications(){ auth.get(Role.ADMIN); return apps.findAll(Sort.by(Sort.Direction.DESC, "appliedAt")); }

  // V2: Skill CRUD
  @GetMapping("/skills") public List<Skill> allSkills(){ auth.get(Role.ADMIN); return skills.findAll(Sort.by("skillName")); }
  @PostMapping("/skills") public Skill addSkill(@RequestBody Map<String,String> b){
    auth.get(Role.ADMIN);
    String name = b.getOrDefault("skillName","").trim();
    if (name.isEmpty()) throw Auth.bad("Skill name is required");
    if (skills.findBySkillName(name).isPresent()) throw Auth.bad("Skill already exists");
    Skill k = new Skill(); k.setSkillName(name); return skills.save(k);
  }
  @DeleteMapping("/skills/{id}") public void deleteSkill(@PathVariable Long id){
    auth.get(Role.ADMIN); skills.deleteById(id);
  }
  // V2: Employer listing
  @GetMapping("/employers") public List<Employer> allEmployers(){ auth.get(Role.ADMIN); return employers.findAll(); }
  // V2: Seeker listing
  @GetMapping("/seekers") public List<JobSeeker> allSeekers(){ auth.get(Role.ADMIN); return seekers.findAll(); }
}
