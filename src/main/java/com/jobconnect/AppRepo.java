package com.jobconnect;

import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import java.util.*;

public interface AppRepo extends JpaRepository<Application,Long> {
  List<Application> findBySeekerOrderByAppliedAtDesc(JobSeeker s);
  List<Application> findBySeeker(JobSeeker s);
  List<Application> findByJob(Job j);
  boolean existsByJobAndSeeker(Job j, JobSeeker s);
  // V2 dashboard counts
  long countBySeeker(JobSeeker s);
  long countBySeekerAndStatus(JobSeeker s, String status);
}
