package com.jobconnect;

import lombok.RequiredArgsConstructor;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;
import java.util.*;import java.util.stream.*;

/** Business logic layer (Controller -> Service -> Repository). */
@Service @RequiredArgsConstructor
public class AppService {
  private final UserRepo users; private final SeekerRepo seekers; private final EmployerRepo employers;
  private final JobRepo jobs; private final AppRepo apps; private final SavedRepo saved;
  private final NotificationRepo notifications;

  @Transactional public Application apply(Job j, JobSeeker s){
    if (!j.isApproved() || !"ACTIVE".equals(j.getStatus())) throw Auth.bad("This job is not accepting applications");
    if (s.getResume() == null) throw Auth.bad("Upload your resume in My profile before applying");
    if (apps.existsByJobAndSeeker(j, s)) throw Auth.bad("You have already applied for this job");
    Application a = new Application(); a.setJob(j); a.setSeeker(s); a.setResume(s.getResume());
    Application saved_app = apps.save(a);
    // V2 notifications
    notify(s.getUser(), "Your application for \"" + j.getTitle() + "\" has been submitted.", "APPLICATION_SUBMITTED", j.getJobId());
    notify(j.getEmployer().getUser(), s.getUser().getName() + " applied for \"" + j.getTitle() + "\".", "NEW_APPLICATION", saved_app.getApplicationId());
    return saved_app;
  }
  @Transactional public Application updateStatus(Application a, String status) {
    String old = a.getStatus();
    a.setStatus(status);
    Application updated = apps.save(a);
    // V2 notification to seeker
    notify(a.getSeeker().getUser(), "Your application for \"" + a.getJob().getTitle() + "\" status changed to " + status.replace('_', ' ').toLowerCase() + ".", "STATUS_CHANGED", a.getApplicationId());
    return updated;
  }
  @Transactional public void deleteJob(Job j){
    apps.deleteAll(apps.findByJob(j)); saved.deleteAll(saved.findByJob(j)); jobs.delete(j);
  }
  @Transactional public void deleteUser(User u){
    seekers.findByUser(u).ifPresent(s -> { apps.deleteAll(apps.findBySeeker(s)); saved.deleteAll(saved.findBySeeker(s)); seekers.delete(s); });
    employers.findByUser(u).ifPresent(e -> { jobs.findByEmployerOrderByCreatedAtDesc(e).forEach(this::deleteJob); employers.delete(e); });
    notifications.deleteAll(notifications.findByUserOrderByCreatedAtDesc(u));
    users.delete(u);
  }
  // V2 recommendations - rule-based matching
  public List<Map<String,Object>> recommend(JobSeeker seeker) {
    List<Job> candidates = jobs.findApprovedActiveExcludingApplied(seeker);
    String[] seekerSkills = (seeker.getSkills() == null ? "" : seeker.getSkills()).toLowerCase().split("\\s*,\\s*");
    Set<String> skillSet = Arrays.stream(seekerSkills).filter(s -> !s.isEmpty()).collect(Collectors.toSet());
    String seekerLoc = (seeker.getLocation() == null ? "" : seeker.getLocation()).toLowerCase().trim();
    String seekerExp = (seeker.getExperience() == null ? "" : seeker.getExperience()).toLowerCase().trim();

    List<Map<String,Object>> results = new ArrayList<>();
    for (Job j : candidates) {
      List<String> reasons = new ArrayList<>();
      // Skill matching
      String[] jobSkills = (j.getSkills() == null ? "" : j.getSkills()).toLowerCase().split("\\s*,\\s*");
      long matched = Arrays.stream(jobSkills).filter(s -> !s.isEmpty() && skillSet.contains(s.trim())).count();
      if (matched > 0) reasons.add("Matches " + matched + " of your skills");
      // Location matching
      if (!seekerLoc.isEmpty() && j.getLocation() != null && j.getLocation().toLowerCase().contains(seekerLoc))
        reasons.add("Matches your location");
      // Experience matching
      if (!seekerExp.isEmpty() && j.getExperience() != null && j.getExperience().toLowerCase().contains(seekerExp))
        reasons.add("Matches your experience level");
      if (!reasons.isEmpty()) {
        Map<String,Object> entry = new LinkedHashMap<>();
        entry.put("job", j);
        entry.put("reasons", reasons);
        entry.put("score", matched * 3 + reasons.size());
        results.add(entry);
      }
    }
    results.sort((a, b) -> ((Comparable) b.get("score")).compareTo(a.get("score")));
    return results.stream().limit(10).collect(Collectors.toList());
  }
  // V2 notification helper
  public void notify(User u, String message, String type, Long refId) {
    Notification n = new Notification();
    n.setUser(u); n.setMessage(message); n.setType(type); n.setReferenceId(refId);
    notifications.save(n);
  }
}
