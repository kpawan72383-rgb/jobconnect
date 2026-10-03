package com.jobconnect;

import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import java.util.*;

public interface SeekerRepo extends JpaRepository<JobSeeker,Long> { Optional<JobSeeker> findByUser(User u); }
