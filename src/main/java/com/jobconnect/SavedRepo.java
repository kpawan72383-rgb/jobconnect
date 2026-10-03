package com.jobconnect;

import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import java.util.*;

public interface SavedRepo extends JpaRepository<SavedJob,Long> {
  List<SavedJob> findBySeekerOrderBySavedAtDesc(JobSeeker s);
  List<SavedJob> findBySeeker(JobSeeker s);
  List<SavedJob> findByJob(Job j);
  Optional<SavedJob> findBySeekerAndJob(JobSeeker s, Job j);
  long countBySeeker(JobSeeker s);  // V2
}
