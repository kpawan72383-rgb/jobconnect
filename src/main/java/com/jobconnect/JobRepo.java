package com.jobconnect;

import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import java.util.*;

public interface JobRepo extends JpaRepository<Job,Long> {
  @Query("""
    select j from Job j where j.approved = true and j.status = 'ACTIVE'
    and (:q = '' or lower(j.title) like lower(concat('%',:q,'%')) or lower(j.skills) like lower(concat('%',:q,'%')) or lower(j.description) like lower(concat('%',:q,'%')))
    and (:loc = '' or lower(j.location) like lower(concat('%',:loc,'%')))
    and (:type = '' or j.jobType = :type)
    and (:exp = '' or lower(j.experience) like lower(concat('%',:exp,'%')))
    and j.salaryMin >= :sal
    and (:skill = '' or lower(j.skills) like lower(concat('%',:skill,'%')))
    order by j.createdAt desc""")
  List<Job> search(@Param("q") String q, @Param("loc") String loc, @Param("type") String type,
                   @Param("exp") String exp, @Param("sal") double sal, @Param("skill") String skill);
  List<Job> findByEmployerOrderByCreatedAtDesc(Employer e);
  long countByStatusAndApproved(String status, boolean approved);
  // V2 employer dashboard
  long countByEmployer(Employer e);
  long countByEmployerAndStatus(Employer e, String status);
  // V2 recommendations
  @Query("""
    select j from Job j where j.approved = true and j.status = 'ACTIVE'
    and j.jobId not in (select a.job.jobId from Application a where a.seeker = :seeker)
    order by j.createdAt desc""")
  List<Job> findApprovedActiveExcludingApplied(@Param("seeker") JobSeeker seeker);
}
